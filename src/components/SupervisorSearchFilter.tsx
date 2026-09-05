import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  X, 
  GraduationCap, 
  Check, 
  ExternalLink, 
  Award,
  Users
} from 'lucide-react';
import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { 
  normalizePersian, 
  matchesPersian, 
  ensureDoctorPrefix, 
  isProfessorColumn, 
  getProfessorRoleFromColumnHeader 
} from '../utils/persianUtils';
import { ProfessorDefensesModal } from './ProfessorDefensesModal';

interface SupervisorSearchFilterProps {
  records: DefenseRecord[];
  columns: ColumnDefinition[];
  selectedSupervisor: string | null;
  onSelectSupervisor: (supervisor: string | null) => void;
  onOpenProfessorModal?: (professorName: string) => void;
}

interface ProfessorSummary {
  name: string;
  count: number;
  roles: string[];
}

export const SupervisorSearchFilter: React.FC<SupervisorSearchFilterProps> = ({
  records,
  columns,
  selectedSupervisor,
  onSelectSupervisor,
  onOpenProfessorModal,
}) => {
  const [searchValue, setSearchValue] = useState(selectedSupervisor || '');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [modalProfessor, setModalProfessor] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync internal search input with selectedSupervisor prop
  useEffect(() => {
    setSearchValue(selectedSupervisor || '');
  }, [selectedSupervisor]);

  // Identify all professor columns in the dataset (راهنما، مشاور، داور داخلی، داور خارجی، ناظر و...)
  const professorColumns = useMemo(() => {
    return columns.filter(c => 
      isProfessorColumn(c.label) || 
      isProfessorColumn(c.originalKey)
    );
  }, [columns]);

  // Aggregate all unique professors from ALL rows and ALL professor columns
  const allProfessors = useMemo<ProfessorSummary[]>(() => {
    if (professorColumns.length === 0) return [];

    const profMap: Record<string, { count: number; roles: Set<string> }> = {};

    records.forEach(rec => {
      // Keep track of which professors already counted in this specific record to avoid duplicates per defense
      const seenProfsInThisRecord = new Set<string>();

      professorColumns.forEach(col => {
        const rawVal = rec[col.id] || rec[col.originalKey];
        if (rawVal) {
          const strVal = String(rawVal).trim();
          if (strVal && strVal !== '-' && strVal !== '—' && strVal !== 'ندارد' && strVal !== 'نامشخص') {
            const profName = ensureDoctorPrefix(strVal);
            const role = getProfessorRoleFromColumnHeader(col.label || col.originalKey);

            if (!profMap[profName]) {
              profMap[profName] = { count: 0, roles: new Set() };
            }

            profMap[profName].roles.add(role);

            if (!seenProfsInThisRecord.has(profName)) {
              profMap[profName].count += 1;
              seenProfsInThisRecord.add(profName);
            }
          }
        }
      });
    });

    return Object.entries(profMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        roles: Array.from(data.roles),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fa'));
  }, [records, professorColumns]);

  // Professors matching current search term (partial name/surname across all columns)
  const matchedProfessors = useMemo(() => {
    if (!searchValue.trim()) return allProfessors;
    return allProfessors.filter(s => matchesPersian(s.name, searchValue));
  }, [allProfessors, searchValue]);

  // Total defense records matching the current search term
  const totalMatchedDefenses = useMemo(() => {
    if (!searchValue.trim()) return 0;
    return matchedProfessors.reduce((sum, s) => sum + s.count, 0);
  }, [matchedProfessors, searchValue]);

  if (professorColumns.length === 0 || allProfessors.length === 0) {
    return null;
  }

  const handleInputChange = (val: string) => {
    setSearchValue(val);
    if (val.trim()) {
      onSelectSupervisor(val.trim());
      setIsOpenDropdown(true);
    } else {
      onSelectSupervisor(null);
    }
  };

  const handleSelectExactProfessor = (name: string) => {
    setSearchValue(name);
    onSelectSupervisor(name);
    setIsOpenDropdown(false);
    // Open separate modal window immediately
    handleOpenModal(name);
  };

  const handleOpenModal = (name?: string) => {
    const targetName = (name || searchValue).trim();
    if (!targetName) return;

    if (onOpenProfessorModal) {
      onOpenProfessorModal(targetName);
    }
    setModalProfessor(targetName);
    setIsModalOpen(true);
  };

  const handleClear = () => {
    setSearchValue('');
    onSelectSupervisor(null);
    setIsOpenDropdown(false);
  };

  return (
    <>
      <div className="bg-[#111116] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Info */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  جستجوی اختصاصی دفاع‌های استاد
                </h3>
                <span className="text-[11px] font-normal text-purple-400 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{allProfessors.length} استاد در سامانه</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                با جستجوی نام یا نام‌خانوادگی استاد، کلیه جلسات دفاع با نقش ایشان (راهنما، مشاور، داور و ناظر) در یک پنجره جداگانه نمایش داده می‌شود
              </p>
            </div>
          </div>

          {/* Search Input Box & Controls */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpenDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchValue.trim()) {
                    setIsOpenDropdown(false);
                    handleOpenModal(searchValue.trim());
                  }
                }}
                placeholder="جستجوی نام یا نام‌خانوادگی استاد (راهنما، مشاور، داور، ناظر)..."
                className="w-full bg-[#16161c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 pr-10 pl-9 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              {searchValue && (
                <button
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-200 absolute left-2.5 top-2.5 rounded hover:bg-slate-800 transition-colors"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dropdown Suggestions Menu */}
              {isOpenDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpenDropdown(false)} 
                  />
                  <div className="absolute top-full right-0 left-0 mt-1.5 bg-[#16161e] border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto py-1.5 divide-y divide-slate-800/60">
                    <div className="px-3.5 py-2 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>اساتید منطبق ({matchedProfessors.length} مورد)</span>
                      {searchValue && (
                        <span className="text-purple-300 font-bold">{totalMatchedDefenses} دفاع یافت شد</span>
                      )}
                    </div>
                    {matchedProfessors.length === 0 ? (
                      <div className="px-3.5 py-4 text-center text-xs text-slate-400">
                        استادی با این نام یا فامیل در سطرها یافت نشد
                      </div>
                    ) : (
                      matchedProfessors.map(prof => {
                        const isExactSelected = normalizePersian(searchValue) === normalizePersian(prof.name);
                        return (
                          <button
                            key={prof.name}
                            type="button"
                            onClick={() => handleSelectExactProfessor(prof.name)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-right transition-colors ${
                              isExactSelected 
                                ? 'bg-purple-950/70 text-purple-300 font-semibold' 
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <UserCheck className={`w-3.5 h-3.5 shrink-0 ${isExactSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                                <span className="truncate font-medium">{prof.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mr-5">
                                {prof.roles.slice(0, 3).map(r => (
                                  <span key={r} className="text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-800">
                                    {r}
                                  </span>
                                ))}
                                {prof.roles.length > 3 && (
                                  <span className="text-[10px] text-slate-500">+{prof.roles.length - 3}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 mr-2">
                              <span className="text-[11px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-purple-300 font-medium font-mono">
                                {prof.count} دفاع
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400" />
                              {isExactSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dedicated "Open in Separate Window" button */}
            <button
              onClick={() => handleOpenModal(searchValue)}
              disabled={!searchValue.trim()}
              className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-purple-950/40"
              title="نمایش تمام دفاع‌های این استاد با نقش ایشان در پنجره جداگانه"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">پنجره جداگانه</span>
              <span className="sm:hidden">مشاهده</span>
            </button>

            {/* Reset button if search is active */}
            {selectedSupervisor && (
              <button
                onClick={handleClear}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden md:inline">پاکسازی</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter & Separate Window Quick Launcher Banner */}
        {selectedSupervisor && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2.5 bg-purple-950/30 border border-purple-800/40 p-3 rounded-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping shrink-0"></span>
              <span className="text-xs text-slate-300">
                جلسات دفاع استاد:
              </span>
              <span className="text-xs font-bold text-purple-200 bg-purple-900/70 px-2.5 py-0.5 rounded-lg border border-purple-700/50">
                {ensureDoctorPrefix(selectedSupervisor)}
              </span>
              <span className="text-xs text-purple-300 font-semibold bg-slate-900/90 px-2.5 py-0.5 rounded-md border border-purple-900/50">
                مجموع {totalMatchedDefenses} جلسه دفاع
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal(selectedSupervisor)}
                className="text-xs text-purple-300 hover:text-white bg-purple-900/60 hover:bg-purple-800/80 border border-purple-600/60 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>مشاهده جدول در پنجره جداگانه</span>
              </button>

              <button
                onClick={handleClear}
                className="text-[11px] text-slate-400 hover:text-white underline flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>حذف فیلتر</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Separate Window Modal for Professor's Defenses */}
      {isModalOpen && modalProfessor && (
        <ProfessorDefensesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          professorName={modalProfessor}
          records={records}
          columns={columns}
        />
      )}
    </>
  );
};
