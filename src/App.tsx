import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { SupervisorSearchFilter } from './components/SupervisorSearchFilter';
import { DefenseTable } from './components/DefenseTable';
import { TimelineCalendarView } from './components/TimelineCalendarView';
import { DefenseDetailsModal } from './components/DefenseDetailsModal';
import { DriveImportModal } from './components/DriveImportModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { EditRecordModal } from './components/EditRecordModal';
import { UserLoginModal } from './components/UserLoginModal';
import { AdminUserManagementModal } from './components/AdminUserManagementModal';
import { ApprovalStatus, ColumnDefinition, DefenseRecord, DefenseStats, FilterValues } from './types/defense';
import { AppUser } from './types/user';
import { getStoredUsers, saveStoredUsers, getStoredCurrentUser, saveStoredCurrentUser } from './data/defaultUsers';
import { parseExcelOrCsvData, exportToExcel } from './utils/excelParser';
import { matchesPersian, sortRecordsByDefenseDate, normalizePersian, isProfessorColumn } from './utils/persianUtils';
import { RAW_SAMPLE_CSV } from './data/sampleData';
import { workspaceService, TARGET_FILE_NAME } from './services/googleWorkspaceService';
import { LocalDataResult, localDataService } from './services/localDataService';
import { LocalFileModal } from './components/LocalFileModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { CheckCircle2, AlertCircle, RefreshCw, Cloud, Play, Pause, Zap } from 'lucide-react';

const REFRESH_INTERVAL_SECONDS = 20;

export default function App() {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [records, setRecords] = useState<DefenseRecord[]>([]);
  const [excludedColumnNames, setExcludedColumnNames] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState<string>(TARGET_FILE_NAME);
  
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedSupervisor, setSelectedSupervisor] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [selectedRecord, setSelectedRecord] = useState<DefenseRecord | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLocalFileModalOpen, setIsLocalFileModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Sync state & 20-second Auto-Refresh
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('defense_is_admin') === 'true';
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<DefenseRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // User Management & Authentication States
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredCurrentUser());
  const [isUserLoginModalOpen, setIsUserLoginModalOpen] = useState(false);
  const [isAdminUserManagementModalOpen, setIsAdminUserManagementModalOpen] = useState(false);

  // Local file sync and load logic
  const loadDataFromLocal = useCallback(async (showToast = false) => {
    setIsSyncingDrive(true);
    if (showToast) setSyncToast(null);

    try {
      const data = await localDataService.loadDefenseData();
      setColumns(data.columns);
      setRecords(data.records);
      setExcludedColumnNames(data.excludedColumnNames);
      setSourceName(data.sourceName || 'form_defa.xlsx');
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        saveStoredUsers(data.users);
      }
      setLastSyncedTime(new Date());

      if (showToast) {
        setSyncToast({
          message: `اطلاعات با موفقیت از فایل محلی «${data.sourceName || 'form_defa.xlsx'}» بازخوانی شد (${data.records.length} رکورد).`,
          type: 'success',
        });
        setTimeout(() => setSyncToast(null), 5000);
      }
    } catch (err: any) {
      console.error('Error loading local data:', err);
      if (showToast) {
        setSyncToast({
          message: 'خطا در بارگذاری اطلاعات از فایل محلی.',
          type: 'error',
        });
        setTimeout(() => setSyncToast(null), 5000);
      }
    } finally {
      setIsSyncingDrive(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadDataFromLocal(false);
  }, [loadDataFromLocal]);

  // Quick Manual Sync from local file
  const handleQuickSyncDrive = () => {
    loadDataFromLocal(true);
    setRefreshCountdown(REFRESH_INTERVAL_SECONDS);
  };

  // Periodic Auto-Refresh from local file
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          loadDataFromLocal(false);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled, loadDataFromLocal]);

  // Admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('defense_is_admin', 'true');
  };

  // Admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setApprovalFilter('all');
    localStorage.removeItem('defense_is_admin');
    if (currentUser?.role === 'admin') {
      setCurrentUser(null);
      saveStoredCurrentUser(null);
    }
  };

  // User registration & authentication handlers
  const handleRegisterNewDefense = () => {
    if (currentUser || isAdmin) {
      setIsNewRecord(true);
      setRecordToEdit(null);
      setIsEditModalOpen(true);
    } else {
      setIsUserLoginModalOpen(true);
    }
  };

  const handleUserLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    saveStoredCurrentUser(user);
    if (user.role === 'admin') {
      setIsAdmin(true);
      localStorage.setItem('defense_is_admin', 'true');
    }
    // After login, open form for new defense registration
    setIsNewRecord(true);
    setRecordToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  const handleUpdateUsers = async (updatedUsers: AppUser[]) => {
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    if (currentUser) {
      const refreshed = updatedUsers.find(u => u.id === currentUser.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        saveStoredCurrentUser(refreshed);
      }
    }
    await localDataService.saveDefenseData(records, columns, updatedUsers);
  };

  // Update a single column filter
  const handleFilterChange = (columnId: string, text: string, options: string[]) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: {
        text,
        selectedOptions: options,
      },
    }));
  };

  // Reset filter for a specific column
  const handleResetColumnFilter = (columnId: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  // Reset all active filters
  const handleResetAllFilters = () => {
    setFilters({});
    setSelectedSupervisor(null);
    setApprovalFilter('all');
  };

  // Supervisor Column Helper
  const supervisorColumn = useMemo(() => {
    return columns.find(c => 
      c.label.includes('استاد راهنما') || 
      c.originalKey.includes('استاد راهنما') ||
      c.label.includes('راهنما')
    );
  }, [columns]);

  // Filtered records calculation for stats & export & timeline
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // 0. Non-admins can only see approved records
      const recordStatus = record.approvalStatus || 'approved';
      if (!isAdmin && recordStatus !== 'approved') {
        return false;
      }

      // 1. Admin approval filter
      if (isAdmin && approvalFilter && approvalFilter !== 'all') {
        if (recordStatus !== approvalFilter) {
          return false;
        }
      }

      // 2. Dedicated Professor Filter (Check across ANY professor column in the row)
      if (selectedSupervisor && selectedSupervisor.trim()) {
        const normSelected = normalizePersian(selectedSupervisor);
        const matchesAnyProf = columns.some(col => {
          if (!isProfessorColumn(col.label) && !isProfessorColumn(col.originalKey)) return false;
          const cellVal = String((record[col.id] as string) || (record[col.originalKey] as string) || '').trim();
          if (!cellVal || cellVal === '-' || cellVal === '—' || cellVal === 'ندارد' || cellVal === 'نامشخص') return false;
          return matchesPersian(cellVal, selectedSupervisor) || normalizePersian(cellVal).includes(normSelected);
        });
        if (!matchesAnyProf) {
          return false;
        }
      }

      // 3. Per-Column Popover Filters
      for (const colId in filters) {
        const filter = filters[colId];
        if (!filter) continue;

        const rawVal = record[colId];
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

        // Text search filter
        if (filter.text && filter.text.trim()) {
          if (!matchesPersian(valStr, filter.text)) {
            return false;
          }
        }

        // Multi-select options filter
        if (filter.selectedOptions && filter.selectedOptions.length > 0) {
          const matchOption = filter.selectedOptions.some(opt => {
            if (opt === '(خالی)' && (!valStr || valStr.trim() === '')) return true;
            return valStr.trim() === opt.trim();
          });
          if (!matchOption) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, filters, selectedSupervisor, supervisorColumn, approvalFilter, isAdmin]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    Object.values(filters).forEach((f: any) => {
      if (f?.text && f.text.trim()) count++;
      if (f?.selectedOptions && f.selectedOptions.length > 0) count++;
    });
    if (selectedSupervisor) count++;
    if (approvalFilter !== 'all') count++;
    return count;
  }, [filters, selectedSupervisor, approvalFilter]);

  // Stats calculation
  const stats: DefenseStats = useMemo(() => {
    const total = records.length;
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    records.forEach(r => {
      const status = r.approvalStatus || 'approved';
      if (status === 'approved') approved++;
      else if (status === 'pending') pending++;
      else if (status === 'rejected') rejected++;
    });

    const uniqueSupervisors = new Set<string>();
    const uniqueDates = new Set<string>();
    let mscCount = 0;
    let phdCount = 0;

    filteredRecords.forEach(r => {
      // Supervisors
      if (supervisorColumn) {
        const sup = String((r[supervisorColumn.id] as string) || (r[supervisorColumn.originalKey] as string) || '').trim();
        if (sup) uniqueSupervisors.add(sup);
      }
      // Dates
      const dateVal = String((r['col_combined_date'] as string) || (r['تاریخ دفاع'] as string) || '').trim();
      if (dateVal) uniqueDates.add(dateVal);

      // Degrees
      const degree = String((r['مقطع تحصیلی'] as string) || (r['مقطع'] as string) || '').trim();
      if (degree.includes('دکتری') || degree.includes('دکترا')) {
        phdCount++;
      } else if (degree.includes('ارشد') || degree.includes('کارشناسی ارشد')) {
        mscCount++;
      }
    });

    return {
      totalRecords: total,
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      uniqueSupervisorsCount: uniqueSupervisors.size,
      uniqueDatesCount: uniqueDates.size,
      mscCount,
      phdCount,
    };
  }, [records, filteredRecords, supervisorColumn]);

  // Admin CRUD Actions
  const handleAddNewRecord = () => {
    setIsNewRecord(true);
    setRecordToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleEditRecord = (record: DefenseRecord) => {
    setIsNewRecord(false);
    setRecordToEdit(record);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (updatedRecord: DefenseRecord) => {
    let updatedList: DefenseRecord[];
    const exists = records.some(r => r.id === updatedRecord.id);
    if (exists) {
      updatedList = records.map(r => (r.id === updatedRecord.id ? updatedRecord : r));
    } else {
      updatedList = [updatedRecord, ...records];
    }
    const sorted = sortRecordsByDefenseDate(updatedList, columns, true);
    setRecords(sorted);

    if (selectedRecord && selectedRecord.id === updatedRecord.id) {
      setSelectedRecord(updatedRecord);
    }

    await localDataService.saveDefenseData(sorted, columns, users);
    setSyncToast({
      message: 'تغییرات مستقیماً در فایل محلی form_defa.xlsx ذخیره شد.',
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleDeleteRecord = async (recordId: string) => {
    const updatedList = records.filter(r => r.id !== recordId);
    setRecords(updatedList);
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord(null);
    }
    await localDataService.saveDefenseData(updatedList, columns, users);
    setSyncToast({
      message: 'رکورد حذف شد و در فایل محلی form_defa.xlsx ثبت گردید.',
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Quick Approval Toggle
  const handleToggleApproval = async (recordId: string, newStatus: ApprovalStatus) => {
    const statusPersian = newStatus === 'approved' ? 'تایید شده (نمایش)' : newStatus === 'pending' ? 'در انتظار تایید' : 'عدم نمایش (رد شده)';
    const updatedList = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          approvalStatus: newStatus,
          col_approval_status: statusPersian,
          'وضعیت تایید نمایش': statusPersian,
          'وضعیت تایید': statusPersian,
        };
      }
      return r;
    });
    setRecords(updatedList);

    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord(prev => prev ? {
        ...prev,
        approvalStatus: newStatus,
        col_approval_status: statusPersian,
        'وضعیت تایید نمایش': statusPersian,
        'وضعیت تایید': statusPersian,
      } : null);
    }

    await localDataService.saveDefenseData(updatedList, columns, users);
    setSyncToast({
      message: 'وضعیت تایید در فایل محلی form_defa.xlsx به‌روزرسانی شد.',
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Handle Excel Export (includes defense records and users sheet)
  const handleExportExcel = () => {
    exportToExcel(filteredRecords, columns.filter(c => !c.isExcluded), 'form_defa.xlsx', users);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle data load from Google Drive / file upload
  const handleDataLoaded = (data: {
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
    users?: AppUser[];
  }) => {
    setColumns(data.columns);
    setRecords(data.records);
    setExcludedColumnNames(data.excludedColumnNames);
    setSourceName(data.sourceName);
    if (data.users && data.users.length > 0) {
      setUsers(data.users);
      saveStoredUsers(data.users);
    }
    setFilters({});
    setSelectedSupervisor(null);
    setApprovalFilter('all');
    setLastSyncedTime(new Date());
    setRefreshCountdown(REFRESH_INTERVAL_SECONDS);
    setSyncToast({
      message: `اطلاعات با موفقیت از «${data.sourceName}» بارگذاری شد (${data.records.length} رکورد).`,
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 6000);
  };

  // Handle successful Excel upload
  const handleUploadSuccess = (result: LocalDataResult) => {
    setColumns(result.columns);
    setRecords(result.records);
    setExcludedColumnNames(result.excludedColumnNames);
    setSourceName(result.sourceName);
    if (result.users && result.users.length > 0) {
      setUsers(result.users);
      saveStoredUsers(result.users);
    }
    setLastSyncedTime(new Date(result.lastModified));
    setSyncToast({
      message: `فایل «${result.sourceName}» با موفقیت بارگذاری شد و ${result.records.length} رکورد در سامانه اعمال گردید.`,
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 6000);
  };

  const isConnected = workspaceService.isConnected();

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Header */}
      <Header
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenLocalFileModal={() => setIsLocalFileModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onQuickSyncDrive={handleQuickSyncDrive}
        isSyncingDrive={isSyncingDrive}
        onExportExcel={handleExportExcel}
        onResetFilters={handleResetAllFilters}
        onPrint={handlePrint}
        activeFilterCount={activeFiltersCount}
        totalCount={records.length}
        filteredCount={filteredRecords.length}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        sourceName={sourceName}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        onLogoutAdmin={handleAdminLogout}
        onAddNewRecord={handleAddNewRecord}
        onRegisterNewDefense={handleRegisterNewDefense}
        currentUser={currentUser}
        onLogoutUser={handleUserLogout}
        onOpenAdminUserManagement={() => setIsAdminUserManagementModalOpen(true)}
        isConnectedToDrive={isConnected}
      />

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3 animate-fadeIn">
          <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold border ${
            syncToast.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {syncToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{syncToast.message}</span>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Stats Overview Bar */}
        <StatsBar 
          stats={stats} 
          isAdmin={isAdmin}
          onFilterPending={() => {
            setApprovalFilter('pending');
            setViewMode('table');
          }}
        />

        {/* Dedicated Supervisor Search & Filter Bar */}
        <SupervisorSearchFilter
          records={records}
          columns={columns}
          selectedSupervisor={selectedSupervisor}
          onSelectSupervisor={setSelectedSupervisor}
        />

        {/* View Component: Table or Timeline */}
        {viewMode === 'table' ? (
          <DefenseTable
            columns={columns}
            records={records}
            filteredRecords={filteredRecords}
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetColumnFilter={handleResetColumnFilter}
            onResetAllFilters={handleResetAllFilters}
            onSelectRecord={setSelectedRecord}
            isAdmin={isAdmin}
            approvalFilter={approvalFilter}
            onChangeApprovalFilter={setApprovalFilter}
            onToggleApproval={handleToggleApproval}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onAddNewRecord={handleAddNewRecord}
          />
        ) : (
          <TimelineCalendarView
            columns={columns}
            records={filteredRecords}
            onSelectRecord={setSelectedRecord}
          />
        )}
      </main>

      {/* Defense Details Modal */}
      <DefenseDetailsModal
        record={selectedRecord}
        columns={columns}
        onClose={() => setSelectedRecord(null)}
        isAdmin={isAdmin}
        onEdit={(rec) => {
          setSelectedRecord(null);
          handleEditRecord(rec);
        }}
        onToggleApproval={handleToggleApproval}
      />

      {/* Google Drive / Excel Import Modal */}
      <DriveImportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Add/Edit Record Modal */}
      <EditRecordModal
        isOpen={isEditModalOpen}
        record={recordToEdit}
        columns={columns}
        isNew={isNewRecord}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onClose={() => {
          setIsEditModalOpen(false);
          setRecordToEdit(null);
        }}
        onSave={handleSaveRecord}
      />

      {/* User Login Modal for Registering New Defense */}
      <UserLoginModal
        isOpen={isUserLoginModalOpen}
        onClose={() => setIsUserLoginModalOpen(false)}
        onLoginSuccess={handleUserLoginSuccess}
        users={users}
      />

      {/* Admin User Management & Professor Editing Window */}
      <AdminUserManagementModal
        isOpen={isAdminUserManagementModalOpen}
        onClose={() => setIsAdminUserManagementModalOpen(false)}
        users={users}
        onUpdateUsers={handleUpdateUsers}
        records={records}
        columns={columns}
      />

      {/* Local Excel File & Permanent Link Modal */}
      <LocalFileModal
        isOpen={isLocalFileModalOpen}
        onClose={() => setIsLocalFileModalOpen(false)}
        onRefreshData={() => loadDataFromLocal(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        isRefreshing={isSyncingDrive}
        totalRecords={records.length}
      />

      {/* Upload Excel Modal */}
      <ExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onUploadFile={(file) => localDataService.uploadExcelFile(file)}
      />
    </div>
  );
}
