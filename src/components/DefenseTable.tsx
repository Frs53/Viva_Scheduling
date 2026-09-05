import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Columns, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Check, 
  X, 
  RotateCcw,
  SlidersHorizontal,
  Clock,
  Calendar,
  Sparkles,
  Info,
  Edit2,
  Trash2,
  AlertTriangle,
  User,
  CheckCircle2,
  ClockAlert,
  EyeOff,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { ApprovalStatus, ColumnDefinition, DefenseRecord, FilterValues, SortConfig } from '../types/defense';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { matchesPersian, normalizePersian, ensureDoctorPrefix, isProfessorColumn, getDefenseDateTimeScore } from '../utils/persianUtils';
import { formatApprovalStatusPersian } from '../utils/excelParser';

interface DefenseTableProps {
  columns: ColumnDefinition[];
  records: DefenseRecord[];
  filters: FilterValues;
  onFilterChange: (columnId: string, text: string, options: string[]) => void;
  onResetColumnFilter: (columnId: string) => void;
  onResetAllFilters: () => void;
  onSelectRecord: (record: DefenseRecord) => void;
  excludedColumnNames: string[];
  isAdmin?: boolean;
  onEditRecord?: (record: DefenseRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  onToggleApproval?: (recordId: string, newStatus: ApprovalStatus) => void;
  supervisorQuery?: string | null;
  approvalFilter?: ApprovalStatus | 'all';
  onApprovalFilterChange?: (status: ApprovalStatus | 'all') => void;
}

export const DefenseTable: React.FC<DefenseTableProps> = ({
  columns,
  records,
  filters,
  onFilterChange,
  onResetColumnFilter,
  onResetAllFilters,
  onSelectRecord,
  excludedColumnNames,
  isAdmin = false,
  onEditRecord,
  onDeleteRecord,
  onToggleApproval,
  supervisorQuery,
  approvalFilter = 'all',
  onApprovalFilterChange,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [isColSelectorOpen, setIsColSelectorOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DefenseRecord | null>(null);

  // Visible columns based on exclusions, user toggles, and admin status
  const visibleColumns = useMemo(() => {
    return columns.filter(c => {
      if (c.isExcluded || hiddenColumnIds.includes(c.id)) return false;
      // Approval status is an internal admin column - never visible to regular users
      if (!isAdmin && (c.id === 'col_approval_status' || c.label.includes('وضعیت تایید') || c.label.includes('تایید نمایش') || c.originalKey.includes('وضعیت تایید'))) {
        return false;
      }
      return true;
    });
  }, [columns, hiddenColumnIds, isAdmin]);

  // Compute unique values counts for each column based on current dataset
  const columnValueCountsMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    columns.forEach(col => {
      const valMap = new Map<string, number>();
      const isProf = isProfessorColumn(col.label) || isProfessorColumn(col.originalKey);
      records.forEach(rec => {
        let val = (rec[col.id] as string) || (rec[col.originalKey] as string) || '';
        if (val) {
          if (isProf) {
            val = ensureDoctorPrefix(val);
          }
          valMap.set(val, (valMap.get(val) || 0) + 1);
        }
      });
      map.set(col.id, valMap);
    });
    return map;
  }, [columns, records]);

  // Handle sort request
  const handleSort = (columnId: string) => {
    setSortConfig(current => {
      if (current?.columnId === columnId) {
        if (current.direction === 'asc') return { columnId, direction: 'desc' };
        return null;
      }
      return { columnId, direction: 'asc' };
    });
  };

  // Identify supervisor column
  const supervisorColumn = useMemo(() => {
    return columns.find(c => 
      c.label.includes('استاد راهنما') || 
      c.originalKey.includes('استاد راهنما') ||
      c.label.includes('راهنما')
    );
  }, [columns]);

  // Filter records based on approval status, per-column filters, supervisor search, and global search
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // 0. Non-admins can only see approved records
      const recordStatus = record.approvalStatus || 'approved';
      if (!isAdmin && recordStatus !== 'approved') {
        return false;
      }

      // 1. Approval status filter for admins
      if (isAdmin && approvalFilter && approvalFilter !== 'all') {
        if (recordStatus !== approvalFilter) {
          return false;
        }
      }

      // 2. Dedicated Professor Search (Match First & Last Name across ANY professor column in row)
      if (supervisorQuery && supervisorQuery.trim()) {
        const normQuery = normalizePersian(supervisorQuery);
        const matchesAnyProf = columns.some(col => {
          if (!isProfessorColumn(col.label) && !isProfessorColumn(col.originalKey)) return false;
          const cellVal = String((record[col.id] as string) || (record[col.originalKey] as string) || '').trim();
          if (!cellVal || cellVal === '-' || cellVal === '—' || cellVal === 'ندارد' || cellVal === 'نامشخص') return false;
          return matchesPersian(cellVal, supervisorQuery) || normalizePersian(cellVal).includes(normQuery);
        });
        if (!matchesAnyProf) {
          return false;
        }
      }

      // 3. Global Search
      if (globalSearch.trim()) {
        const searchTerms = globalSearch.trim().split(/\s+/);
        const allText = Object.values(record)
          .filter(v => typeof v === 'string' || typeof v === 'number')
          .join(' ');
        
        const matchesGlobal = searchTerms.every(term => matchesPersian(allText, term));
        if (!matchesGlobal) return false;
      }

      // 4. Per-column filters
      for (const col of columns) {
        if (col.isExcluded) continue;
        const filter = filters[col.id];
        if (!filter) continue;

        const cellValue = String(
          (record[col.id] as string) || (record[col.originalKey] as string) || ''
        ).trim();

        // Text filter
        if (filter.text.trim()) {
          if (!matchesPersian(cellValue, filter.text)) {
            return false;
          }
        }

        // Multi-select categorical filter
        if (filter.selectedOptions && filter.selectedOptions.length > 0) {
          if (!filter.selectedOptions.includes(cellValue)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, columns, filters, globalSearch, supervisorQuery, supervisorColumn, isAdmin, approvalFilter]);

  // Counts by approval status
  const approvalCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    records.forEach(r => {
      const s = r.approvalStatus || 'approved';
      if (s === 'approved') approved++;
      else if (s === 'pending') pending++;
      else if (s === 'rejected') rejected++;
    });
    return { approved, pending, rejected, total: records.length };
  }, [records]);

  // Sort filtered records (defaults to defense date chronological order)
  const sortedRecords = useMemo(() => {
    if (!sortConfig) {
      return [...filteredRecords].sort((a, b) => {
        const scoreA = getDefenseDateTimeScore(a, columns);
        const scoreB = getDefenseDateTimeScore(b, columns);
        return scoreA - scoreB;
      });
    }

    // Check if the target sorted column is date-related
    const targetCol = columns.find(c => c.id === sortConfig.columnId);
    const isDateCol =
      sortConfig.columnId === 'col_combined_date' ||
      targetCol?.type === 'date' ||
      targetCol?.label.includes('تاریخ') ||
      targetCol?.originalKey.includes('تاریخ') ||
      targetCol?.label.includes('روز') ||
      targetCol?.originalKey.includes('روز');

    if (isDateCol) {
      return [...filteredRecords].sort((a, b) => {
        const scoreA = getDefenseDateTimeScore(a, columns);
        const scoreB = getDefenseDateTimeScore(b, columns);
        return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    return [...filteredRecords].sort((a, b) => {
      const aVal = String((a[sortConfig.columnId] as string) || '').trim();
      const bVal = String((b[sortConfig.columnId] as string) || '').trim();

      // Check if numeric
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Persian string collation
      const result = aVal.localeCompare(bVal, 'fa');
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredRecords, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize >= 1000) return sortedRecords;
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Total active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    Object.values(filters).forEach((f: { text: string; selectedOptions: string[] }) => {
      if (f.text?.trim() || (f.selectedOptions && f.selectedOptions.length > 0)) count++;
    });
    return count;
  }, [filters]);

  const toggleColumnVisibility = (colId: string) => {
    setHiddenColumnIds(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  return (
    <div className="flex flex-col bg-[#111114] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Table Control Bar */}
      <div className="p-4 bg-[#16161a] border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Global Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="جستجوی همگانی (نام دانشجو، استاد راهنما، گرایش، مقطع، تاریخ...)"
            className="w-full bg-[#0e0e12] border border-slate-700/80 rounded-xl px-3.5 py-2 pr-9 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action badges & Column Selector */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Active Filter Pill */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/50 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium">
              <span>{activeFiltersCount} ستون فیلتر شده</span>
              <button
                onClick={onResetAllFilters}
                className="text-amber-400 hover:text-white mr-1"
                title="پاک کردن همه فیلترها"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Results Count Tag */}
          <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
            نمایش <span className="text-emerald-400 font-bold">{sortedRecords.length}</span> از{' '}
            <span className="text-slate-300 font-medium">{records.length}</span> جلسه دفاع
          </div>

          {/* Column Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsColSelectorOpen(!isColSelectorOpen)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              <Columns className="w-3.5 h-3.5 text-slate-400" />
              <span>مدیریت ستون‌ها ({visibleColumns.length})</span>
            </button>

            {isColSelectorOpen && (
              <div 
                className="absolute left-0 mt-2 w-64 bg-[#16161a] border border-slate-700 rounded-xl shadow-2xl z-40 p-3 text-right animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-white">انتخاب ستون‌های قابل نمایش</span>
                  <button 
                    onClick={() => setIsColSelectorOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {columns.filter(c => {
                    if (c.isExcluded) return false;
                    if (!isAdmin && (c.id === 'col_approval_status' || c.label.includes('وضعیت تایید') || c.label.includes('تایید نمایش') || c.originalKey.includes('وضعیت تایید'))) {
                      return false;
                    }
                    return true;
                  }).map(col => {
                    const isVisible = !hiddenColumnIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        onClick={() => toggleColumnVisibility(col.id)}
                        className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer select-none ${
                          isVisible ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-500 hover:bg-slate-900'
                        }`}
                      >
                        <span className="truncate max-w-[180px]">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {}}
                          className="accent-emerald-500 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Approval Filter Tabs */}
      {isAdmin && (
        <div className="px-4 py-2.5 bg-[#141418] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>فیلتر وضعیت تایید ادمین:</span>
            </span>

            {/* All */}
            <button
              onClick={() => {
                onApprovalFilterChange?.('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                approvalFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              همه ({approvalCounts.total})
            </button>

            {/* Pending */}
            <button
              onClick={() => {
                onApprovalFilterChange?.('pending');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                approvalFilter === 'pending'
                  ? 'bg-amber-950/80 border border-amber-500 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border border-amber-900/30 text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <ClockAlert className="w-3 h-3 text-amber-400" />
              <span>در انتظار تایید ({approvalCounts.pending})</span>
            </button>

            {/* Approved */}
            <button
              onClick={() => {
                onApprovalFilterChange?.('approved');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                approvalFilter === 'approved'
                  ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-emerald-900/30 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>تایید شده / نمایش عمومی ({approvalCounts.approved})</span>
            </button>

            {/* Rejected */}
            <button
              onClick={() => {
                onApprovalFilterChange?.('rejected');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                approvalFilter === 'rejected'
                  ? 'bg-red-950/80 border border-red-500 text-red-300 shadow-sm'
                  : 'bg-slate-900 border border-red-900/30 text-red-400/80 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <EyeOff className="w-3 h-3 text-red-400" />
              <span>عدم نمایش / رد شده ({approvalCounts.rejected})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            * داده‌های جدید تا قبل از تایید ادمین برای عموم کاربران نمایش داده نمی‌شوند.
          </div>
        </div>
      )}

      {/* Interactive Helper Banner */}
      <div className="px-4 py-2 bg-emerald-950/25 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs text-slate-300">
            برای مشاهده <strong className="text-emerald-300">مشخصات کامل دانشجو، اساتید، هیات داوران، تاریخ و ساعت دفاع</strong>، روی هر سطر کلیک کنید.
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          کلید Esc برای بستن صفحه مشخصات
        </span>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-right border-collapse text-xs">
          {/* Table Header with Sorting and Filter Popovers */}
          <thead>
            <tr className="bg-[#16161a] border-b border-slate-800 text-slate-300 select-none">
              <th className="p-3.5 text-center w-12 font-bold text-slate-500 border-l border-slate-800/60">
                #
              </th>
              {visibleColumns.map((col) => {
                const isSorted = sortConfig?.columnId === col.id;

                return (
                  <th
                    key={col.id}
                    className="p-3.5 font-semibold text-slate-300 border-l border-slate-800/60 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Sortable Header Label */}
                      <div
                        onClick={() => handleSort(col.id)}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-white group flex-1"
                        title="برای مرتب‌سازی کلیک کنید"
                      >
                        <span className="font-bold">{col.label}</span>
                        {isSorted ? (
                          sortConfig?.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      {/* Filter Popover for this column */}
                      <ColumnFilterPopover
                        column={col}
                        textFilter={filters[col.id]?.text || ''}
                        selectedOptions={filters[col.id]?.selectedOptions || []}
                        onTextChange={(text) => onFilterChange(col.id, text, filters[col.id]?.selectedOptions || [])}
                        onOptionToggle={(option) => {
                          const current = filters[col.id]?.selectedOptions || [];
                          const updated = current.includes(option)
                            ? current.filter(o => o !== option)
                            : [...current, option];
                          onFilterChange(col.id, filters[col.id]?.text || '', updated);
                        }}
                        onSelectAllOptions={(options) => {
                          onFilterChange(col.id, filters[col.id]?.text || '', options);
                        }}
                        onClearOptions={() => {
                          onFilterChange(col.id, filters[col.id]?.text || '', []);
                        }}
                        onResetColumnFilter={() => onResetColumnFilter(col.id)}
                        columnValuesCounts={columnValueCountsMap.get(col.id) || new Map()}
                      />
                    </div>
                  </th>
                );
              })}
              <th className={`p-3.5 text-center ${isAdmin ? 'w-44' : 'w-20'} font-semibold text-slate-400`}>
                عملیات
              </th>
            </tr>

            {/* In-Line Per-Column Quick Search Row */}
            <tr className="bg-[#111114] border-b border-slate-800">
              <th className="p-2 text-center text-slate-600 border-l border-slate-800/60 font-normal">
                <SlidersHorizontal className="w-3 h-3 mx-auto" />
              </th>
              {visibleColumns.map((col) => {
                const textVal = filters[col.id]?.text || '';
                const selectedOpts = filters[col.id]?.selectedOptions || [];
                return (
                  <th key={`filter_${col.id}`} className="p-2 border-l border-slate-800/60 font-normal">
                    <div className="relative">
                      <input
                        type="text"
                        value={textVal}
                        onChange={(e) => onFilterChange(col.id, e.target.value, selectedOpts)}
                        placeholder={`فیلتر ${col.label}...`}
                        className={`w-full bg-[#18181d] border rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${
                          textVal || selectedOpts.length > 0
                            ? 'border-emerald-500/80 bg-emerald-950/20'
                            : 'border-slate-800 focus:border-slate-600'
                        }`}
                      />
                      {textVal && (
                        <button
                          onClick={() => onFilterChange(col.id, '', selectedOpts)}
                          className="absolute left-1.5 top-1.5 text-slate-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="p-2 text-center font-normal">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={onResetAllFilters}
                    className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    حذف فیلترها
                  </button>
                )}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="text-center py-16 px-4 text-slate-500"
                >
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl mb-3 text-slate-500">
                      <Search className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300 mb-1">
                      هیچ جلسه‌ای با فیلترهای اعمال شده مطابقت ندارد
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      می‌توانید عبارات جستجو یا گزینه‌های انتخاب شده در فیلترها را تغییر داده یا بازنشانی کنید.
                    </p>
                    <button
                      onClick={onResetAllFilters}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>حذف تمامی فیلترها</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record, index) => {
                const rowIndex = (currentPage - 1) * pageSize + index + 1;
                const status = record.approvalStatus || 'approved';

                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelectRecord(record)}
                    className={`transition-colors cursor-pointer group ${
                      status === 'pending'
                        ? 'bg-amber-950/15 hover:bg-amber-950/30'
                        : status === 'rejected'
                        ? 'bg-red-950/10 hover:bg-red-950/25 opacity-75'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="p-3 text-center text-slate-500 font-mono border-l border-slate-800/60">
                      {rowIndex}
                    </td>

                    {/* Column Cells */}
                    {visibleColumns.map((col) => {
                      const cellValue = String(
                        (record[col.id] as string) || (record[col.originalKey] as string) || ''
                      );

                      return (
                        <td
                          key={col.id}
                          className="p-3 border-l border-slate-800/60 text-slate-300 font-normal leading-relaxed"
                        >
                          {renderCellContent(col, cellValue, record)}
                        </td>
                      );
                    })}

                    {/* Action Buttons */}
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* View Details */}
                        <button
                          onClick={() => onSelectRecord(record)}
                          className="p-1.5 bg-[#16161a] hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-800/50 text-slate-400 hover:text-emerald-300 rounded-lg transition-colors"
                          title="مشاهده مشخصات کامل دانشجو و اساتید"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin Quick Approval Toggles */}
                        {isAdmin && (
                          <>
                            {status !== 'approved' ? (
                              <button
                                onClick={() => onToggleApproval?.(record.id, 'approved')}
                                className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-lg transition-colors"
                                title="تأیید و صدور مجوز نمایش عمومی"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onToggleApproval?.(record.id, 'rejected')}
                                className="p-1.5 bg-slate-900 hover:bg-red-950/50 border border-slate-800 hover:border-red-700/60 text-slate-400 hover:text-red-300 rounded-lg transition-colors"
                                title="عدم نمایش برای کاربران (مخفی)"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Admin Edit */}
                            <button
                              onClick={() => onEditRecord?.(record)}
                              className="p-1.5 bg-[#16161a] hover:bg-blue-950/50 border border-slate-800 hover:border-blue-700/60 text-slate-400 hover:text-blue-300 rounded-lg transition-colors"
                              title="ویرایش اطلاعات این جلسه دفاع"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Admin Delete */}
                            <button
                              onClick={() => setRecordToDelete(record)}
                              className="p-1.5 bg-[#16161a] hover:bg-red-950/50 border border-slate-800 hover:border-red-700/60 text-slate-400 hover:text-red-300 rounded-lg transition-colors"
                              title="حذف جلسه دفاع"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer Controls */}
      <div className="p-3.5 bg-[#16161a] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span>تعداد سطر در هر صفحه:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#0e0e12] border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-500"
          >
            <option value={10}>۱۰ سطر</option>
            <option value={15}>۱۵ سطر</option>
            <option value={25}>۲۵ سطر</option>
            <option value={50}>۵۰ سطر</option>
            <option value={5000}>همه سطرها</option>
          </select>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-800 bg-[#0e0e12] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            title="صفحه قبل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-medium text-slate-300">
            صفحه <span className="text-emerald-400 font-bold">{currentPage}</span> از{' '}
            <span className="font-semibold">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg border border-slate-800 bg-[#0e0e12] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            title="صفحه بعد"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-[#121216] border border-red-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-950/60 border border-red-800/60 text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">تأیید حذف جلسه دفاع</h3>
                <p className="text-xs text-slate-400 mt-0.5">این عملیات غیرقابل بازگشت است</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 mb-5 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500">نام دانشجو: </span>
                <strong className="text-white">
                  {String(recordToDelete['نام و نام خانوادگی'] || recordToDelete['دانشجو'] || recordToDelete['نام'] || 'دانشجو')}
                </strong>
              </div>
              {recordToDelete['عنوان'] && (
                <div>
                  <span className="text-slate-500">عنوان: </span>
                  <span className="text-slate-300 line-clamp-2">{String(recordToDelete['عنوان'])}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (recordToDelete) {
                    onDeleteRecord?.(recordToDelete.id);
                    setRecordToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف قطعی</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Custom renderer for cell contents based on column type
 */
function renderCellContent(col: ColumnDefinition, value: string, record: DefenseRecord) {
  const label = col.label.toLowerCase();

  // Approval Status Column
  if (col.id === 'col_approval_status' || label.includes('وضعیت تایید') || label.includes('تایید نمایش')) {
    const status: ApprovalStatus = record.approvalStatus || (value.includes('انتظار') ? 'pending' : value.includes('رد') || value.includes('عدم') ? 'rejected' : 'approved');

    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>تایید شده (نمایش)</span>
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-600/60 animate-pulse">
          <ClockAlert className="w-3 h-3 text-amber-400" />
          <span>در انتظار تایید ادمین</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/60 text-red-300 border border-red-700/50">
        <EyeOff className="w-3 h-3 text-red-400" />
        <span>عدم نمایش (رد شده)</span>
      </span>
    );
  }

  if (!value || value.trim() === '') {
    return <span className="text-slate-600 font-mono text-[11px]">-</span>;
  }

  // Student Degree Badge
  if (label.includes('مقطع')) {
    const isPhd = value.includes('دکتری');
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
          isPhd
            ? 'bg-purple-950/40 text-purple-300 border-purple-800/50'
            : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
        }`}
      >
        {value}
      </span>
    );
  }

  // Defense Type Badge
  if (label.includes('دفاع از')) {
    const isProposal = value.includes('پروپزال') || value.includes('سمینار');
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
          isProposal
            ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
        }`}
      >
        {value}
      </span>
    );
  }

  // Date format (Combined Date)
  if (label.includes('تاریخ')) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-200 bg-slate-900/80 px-2.5 py-0.5 rounded-md border border-slate-800 text-xs">
        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{value}</span>
      </span>
    );
  }

  // Time format
  if (label.includes('ساعت')) {
    return (
      <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/30">
        <Clock className="w-3 h-3 text-emerald-400" />
        {value}
      </span>
    );
  }

  // Day / Month / Year
  if (label.includes('روز') || label.includes('ماه') || label.includes('سال')) {
    return <span className="font-medium text-slate-200">{value}</span>;
  }

  // Student Name
  if (label.includes('دانشجو') || label.includes('نام و نام خانوادگی')) {
    return (
      <span className="inline-flex items-center gap-1.5 font-bold text-white group-hover:text-emerald-300 transition-colors">
        <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30 group-hover:bg-emerald-500/25">
          <User className="w-3 h-3" />
        </span>
        <span className="hover:underline underline-offset-4">{value}</span>
      </span>
    );
  }

  // Phone number
  if (label.includes('شماره') || label.includes('تماس')) {
    return (
      <span className="font-mono text-slate-300 text-[11px]" dir="ltr">
        {value}
      </span>
    );
  }

  // Professor / Supervisor / Advisor / Referee / Observer Columns
  if (isProfessorColumn(col.label) || isProfessorColumn(col.originalKey)) {
    const formattedProf = ensureDoctorPrefix(value);
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
        <span>{formattedProf}</span>
      </span>
    );
  }

  return <span>{value}</span>;
}

