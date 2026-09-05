import React, { useMemo } from 'react';
import { 
  X, 
  GraduationCap, 
  Calendar, 
  Clock, 
  User, 
  FileSpreadsheet, 
  Printer, 
  Award,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { 
  normalizePersian, 
  matchesPersian, 
  isProfessorColumn, 
  getProfessorRoleFromColumnHeader, 
  getStudentRecordName, 
  getDefenseRecordDate, 
  getDefenseRecordTime,
  getDefenseDateTimeScore,
  ensureDoctorPrefix
} from '../utils/persianUtils';

interface ProfessorDefensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorName: string;
  records: DefenseRecord[];
  columns: ColumnDefinition[];
}

export interface ProfessorDefenseRow {
  id: string;
  studentName: string;
  defenseDate: string;
  defenseTime: string;
  role: string;
  record: DefenseRecord;
  dateTimeScore: number;
}

export const ProfessorDefensesModal: React.FC<ProfessorDefensesModalProps> = ({
  isOpen,
  onClose,
  professorName,
  records,
  columns,
}) => {
  // Extract all professor-relevant columns
  const professorColumns = useMemo(() => {
    return columns.filter(c => 
      isProfessorColumn(c.label) || 
      isProfessorColumn(c.originalKey)
    );
  }, [columns]);

  // Aggregate defenses where this professor participates
  const defenses = useMemo<ProfessorDefenseRow[]>(() => {
    if (!professorName.trim()) return [];

    const normTarget = normalizePersian(professorName);
    const results: ProfessorDefenseRow[] = [];

    records.forEach(rec => {
      const matchedRoles: string[] = [];

      // Check all professor columns in this record
      professorColumns.forEach(col => {
        const val = rec[col.id] || rec[col.originalKey];
        if (val) {
          const strVal = String(val).trim();
          if (strVal && strVal !== '-' && strVal !== 'ندارد' && strVal !== 'نامشخص') {
            const normVal = normalizePersian(strVal);
            if (normVal.includes(normTarget) || normTarget.includes(normVal) || matchesPersian(strVal, professorName)) {
              const roleTitle = getProfessorRoleFromColumnHeader(col.label || col.originalKey);
              if (!matchedRoles.includes(roleTitle)) {
                matchedRoles.push(roleTitle);
              }
            }
          }
        }
      });

      // If matched in any professor column
      if (matchedRoles.length > 0) {
        const studentName = getStudentRecordName(rec, columns);
        const defenseDate = getDefenseRecordDate(rec, columns);
        const defenseTime = getDefenseRecordTime(rec, columns);
        const dateTimeScore = getDefenseDateTimeScore(rec, columns);

        results.push({
          id: rec.id,
          studentName,
          defenseDate,
          defenseTime,
          role: matchedRoles.join(' و '),
          record: rec,
          dateTimeScore,
        });
      }
    });

    // Sort chronologically by date and time
    results.sort((a, b) => a.dateTimeScore - b.dateTimeScore);

    return results;
  }, [records, professorColumns, professorName, columns]);

  // Role distribution summary counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    defenses.forEach(d => {
      counts[d.role] = (counts[d.role] || 0) + 1;
    });
    return counts;
  }, [defenses]);

  if (!isOpen) return null;

  const formattedProfName = ensureDoctorPrefix(professorName);

  // Export this professor's defenses table to Excel
  const handleExportExcel = () => {
    const exportData = defenses.map((d, index) => ({
      'ردیف': index + 1,
      'نام و نام خانوادگی دانشجو': d.studentName,
      'تاریخ دفاع': d.defenseDate,
      'ساعت دفاع': d.defenseTime,
      'نقش استاد در دفاع': d.role,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'جلسات دفاع استاد');
    const safeName = formattedProfName.replace(/[^\w\u0600-\u06FF]/g, '_');
    XLSX.writeFile(workbook, `دفاع_های_${safeName}.xlsx`);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="bg-[#111116] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#16161d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  جلسات دفاع {formattedProfName}
                </h2>
                <span className="bg-purple-950/70 text-purple-300 border border-purple-700/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {defenses.length} جلسه دفاع
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                لیست اختصاصی کلیه جلسات دفاع با ذکر مشخصات دانشجو، زمان و نقش استاد
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto no-print">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/60 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              title="دریافت فایل اکسل این جدول"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>اکسل</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              title="چاپ برنامه دفاع‌های استاد"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role breakdown chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0e0e13] border-b border-slate-800/70 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium">تفکیک نقش‌ها:</span>
          {Object.entries(roleCounts).map(([role, count]) => (
            <span 
              key={role}
              className="inline-flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700/70 px-2.5 py-0.5 rounded-md font-sans text-[11px]"
            >
              <Award className="w-3 h-3 text-purple-400" />
              <span>{role}:</span>
              <strong className="text-purple-300">{count}</strong>
            </span>
          ))}
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {defenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-600 stroke-1" />
              <p className="text-sm font-medium text-slate-300">
                هیچ جلسه دفاعی برای «{formattedProfName}» یافت نشد.
              </p>
              <p className="text-xs text-slate-500">
                ممکن است نام استاد در فایل جاری ثبت نشده باشد یا با املای متفاوتی درج شده باشد.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0e0e12]">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#181820] text-slate-300 border-b border-slate-800">
                    <th className="py-3 px-3.5 font-bold text-center w-14 text-slate-400">
                      ردیف
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>نام و نام خانوادگی دانشجو</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تاریخ دفاع</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>ساعت دفاع</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>نقش استاد در دفاع</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {defenses.map((item, idx) => (
                    <tr 
                      key={item.id + '_' + idx}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100">
                        {item.studentName}
                      </td>
                      <td className="py-3 px-4 text-emerald-300 font-medium">
                        {item.defenseDate}
                      </td>
                      <td className="py-3 px-4 text-blue-300 font-mono font-medium dir-ltr text-right">
                        {item.defenseTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          item.role.includes('راهنما')
                            ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                            : item.role.includes('مشاور')
                            ? 'bg-blue-950/60 border-blue-700/60 text-blue-300'
                            : item.role.includes('داور')
                            ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}>
                          <Award className="w-3 h-3 shrink-0" />
                          <span>{item.role}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#14141a] border-t border-slate-800 flex items-center justify-between gap-4 text-xs text-slate-400 no-print">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              مجموع {defenses.length} جلسه دفاع برای {formattedProfName} ثبت شده است.
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
