import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  PlusCircle, 
  AlertCircle, 
  BookOpen, 
  ShieldCheck, 
  Clock, 
  EyeOff, 
  CheckCircle2, 
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { ApprovalStatus, ColumnDefinition, DefenseRecord } from '../types/defense';
import { AppUser } from '../types/user';
import { formatApprovalStatusPersian, normalizeApprovalStatus } from '../utils/excelParser';
import { ensureDoctorPrefix, isProfessorColumn } from '../utils/persianUtils';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DefenseRecord | null;
  columns: ColumnDefinition[];
  onSave: (updatedRecord: DefenseRecord) => void;
  isNew?: boolean;
  isAdmin?: boolean;
  currentUser?: AppUser | null;
}

export const DEGREE_OPTIONS = [
  'کارشناسی ارشد',
  'دکتری',
] as const;

export const DEFENSE_TYPE_OPTIONS_MASTER = [
  'پایان نامه',
] as const;

export const DEFENSE_TYPE_OPTIONS_PHD = [
  'پایان نامه',
  'پروپزال',
  'گزارش پیشرفت 1',
  'گزارش پیشرفت 2',
  'پیش دفاع',
  'دفاع نهایی',
] as const;

const isDegreeColumn = (col: ColumnDefinition): boolean => {
  const norm = (col.label + ' ' + col.originalKey).toLowerCase();
  return norm.includes('مقطع');
};

const isDefenseTypeColumn = (col: ColumnDefinition): boolean => {
  const norm = (col.label + ' ' + col.originalKey).toLowerCase();
  return norm.includes('دفاع از') || norm.includes('نوع دفاع') || norm.includes('موضوع دفاع');
};

function normalizeDegreeValue(val?: string): string {
  if (!val) return 'کارشناسی ارشد';
  const clean = val.trim().toLowerCase();
  if (clean.includes('دکتری') || clean.includes('دکترا') || clean.includes('phd')) {
    return 'دکتری';
  }
  return 'کارشناسی ارشد';
}

function normalizeDefenseTypeValue(val: string | undefined, degree: string): string {
  if (degree === 'کارشناسی ارشد') {
    return 'پایان نامه';
  }
  if (!val) return 'پروپزال';
  const clean = val.trim().toLowerCase();
  if (clean.includes('پیشرفت 1') || clean.includes('پیشرفت ۱')) return 'گزارش پیشرفت 1';
  if (clean.includes('پیشرفت 2') || clean.includes('پیشرفت ۲')) return 'گزارش پیشرفت 2';
  if (clean.includes('پیش دفاع')) return 'پیش دفاع';
  if (clean.includes('دفاع نهایی') || clean.includes('نهایی')) return 'دفاع نهایی';
  if (clean.includes('پروپ')) return 'پروپزال';
  if (clean.includes('پایان') || clean.includes('رساله') || clean.includes('تز')) return 'پایان نامه';
  return 'پروپزال';
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  columns,
  onSave,
  isNew = false,
  isAdmin = true,
  currentUser = null,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('approved');
  const [error, setError] = useState('');

  const visibleCols = columns.filter(c => !c.isExcluded && c.id !== 'col_approval_status');
  const degreeCol = visibleCols.find(isDegreeColumn);
  const defenseTypeCol = visibleCols.find(isDefenseTypeColumn);

  useEffect(() => {
    if (record) {
      const initial: Record<string, string> = {};
      visibleCols.forEach(col => {
        const val = (record[col.id] as string) || (record[col.originalKey] as string) || '';
        initial[col.id] = String(val);
      });

      if (degreeCol) {
        initial[degreeCol.id] = normalizeDegreeValue(initial[degreeCol.id]);
      }
      if (defenseTypeCol) {
        const deg = degreeCol ? initial[degreeCol.id] : 'کارشناسی ارشد';
        initial[defenseTypeCol.id] = normalizeDefenseTypeValue(initial[defenseTypeCol.id], deg);
      }

      setFormData(initial);
      setApprovalStatus(record.approvalStatus || normalizeApprovalStatus(String(record['وضعیت تایید'] || 'approved')));
    } else {
      const initial: Record<string, string> = {};
      visibleCols.forEach(col => {
        let defaultVal = '';
        if (currentUser) {
          const colLabel = (col.label + ' ' + col.originalKey).toLowerCase();
          if (currentUser.role === 'student') {
            if (colLabel.includes('دانشجو') && !colLabel.includes('شماره')) {
              defaultVal = currentUser.fullName;
            } else if (colLabel.includes('تماس') || colLabel.includes('تلفن')) {
              defaultVal = currentUser.phone || '';
            } else if (colLabel.includes('گرایش') || colLabel.includes('رشته')) {
              defaultVal = currentUser.department || '';
            }
          } else if (currentUser.role === 'professor') {
            if (colLabel.includes('راهنما') && !colLabel.includes('دوم')) {
              defaultVal = ensureDoctorPrefix(currentUser.fullName);
            }
          }
        }
        initial[col.id] = defaultVal;
      });

      if (degreeCol) {
        initial[degreeCol.id] = 'کارشناسی ارشد';
      }
      if (defenseTypeCol) {
        initial[defenseTypeCol.id] = 'پایان نامه';
      }

      setFormData(initial);
      // New record defaults to pending approval if submitted by student or professor
      setApprovalStatus(isAdmin ? 'approved' : 'pending');
    }
    setError('');
  }, [record, isOpen, isNew, currentUser, isAdmin]);

  if (!isOpen) return null;

  const handleChange = (columnId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [columnId]: value,
    }));
  };

  const handleDegreeChange = (colId: string, newDegree: string) => {
    setFormData(prev => {
      const updated = { ...prev, [colId]: newDegree };
      if (defenseTypeCol) {
        if (newDegree === 'کارشناسی ارشد') {
          updated[defenseTypeCol.id] = 'پایان نامه';
        } else if (newDegree === 'دکتری') {
          const curr = prev[defenseTypeCol.id];
          if (!curr || (curr !== 'پایان نامه' && !DEFENSE_TYPE_OPTIONS_PHD.includes(curr as any))) {
            updated[defenseTypeCol.id] = 'پروپزال';
          }
        }
      }
      return updated;
    });
  };

  const handleDefenseTypeChange = (colId: string, newType: string) => {
    const currentDegree = degreeCol ? normalizeDegreeValue(formData[degreeCol.id]) : 'کارشناسی ارشد';
    if (currentDegree === 'کارشناسی ارشد') {
      setFormData(prev => ({
        ...prev,
        [colId]: 'پایان نامه',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [colId]: newType,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one meaningful field is filled (student or title)
    const hasValues = Object.values(formData).some((v: string) => typeof v === 'string' && v.trim().length > 0);
    if (!hasValues) {
      setError('لطفا حداقل اطلاعات دانشجو یا عنوان پایان‌نامه را وارد نمایید.');
      return;
    }

    const updatedRecord: DefenseRecord = {
      id: record ? record.id : `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...record,
      approvalStatus: approvalStatus,
      'col_approval_status': formatApprovalStatusPersian(approvalStatus),
      'وضعیت تایید نمایش': formatApprovalStatusPersian(approvalStatus),
      'وضعیت تایید': formatApprovalStatusPersian(approvalStatus),
    };

    const currentSelectedDegree = degreeCol ? normalizeDegreeValue(formData[degreeCol.id]) : 'کارشناسی ارشد';

    visibleCols.forEach(col => {
      let val = formData[col.id] || '';
      
      if (degreeCol && col.id === degreeCol.id) {
        val = currentSelectedDegree;
      } else if (defenseTypeCol && col.id === defenseTypeCol.id) {
        if (currentSelectedDegree === 'کارشناسی ارشد') {
          val = 'پایان نامه';
        } else {
          val = val || 'پروپزال';
        }
      } else if (val && (isProfessorColumn(col.label) || isProfessorColumn(col.originalKey))) {
        val = ensureDoctorPrefix(val);
      }

      updatedRecord[col.id] = val;
      updatedRecord[col.originalKey] = val;
    });

    onSave(updatedRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#121216] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#16161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              {isNew ? <PlusCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {isNew ? 'ثبت جلسه دفاع جدید' : 'ویرایش اطلاعات جلسه دفاع'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNew ? 'اطلاعات جلسه دفاع را تکمیل نمایید' : 'تغییرات مستقیماً در جدول اعمال خواهد شد'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container - Bounded & Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current User Info Banner */}
            {currentUser && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    ثبت‌کننده دفاع: <strong className="text-white">{currentUser.fullName}</strong>
                    {currentUser.role === 'student' ? ' (دانشجو)' : currentUser.role === 'professor' ? ' (استاد)' : ' (مدیر سامانه)'}
                  </span>
                </div>
                {currentUser.code && (
                  <span className="font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]" dir="ltr">
                    {currentUser.code}
                  </span>
                )}
              </div>
            )}

            {/* Approval / Visibility Control Box - Shown to Admin */}
            {isAdmin ? (
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>وضعیت تایید و مجوز نمایش به کاربران:</span>
                  </label>
                  <span className="text-[11px] text-purple-400 font-medium bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    دسترسی مدیریت
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalStatus('approved')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      approvalStatus === 'approved'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                        : 'bg-[#16161d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تایید شده (نمایش عمومی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalStatus('pending')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      approvalStatus === 'pending'
                        ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/50'
                        : 'bg-[#16161d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>در انتظار تایید ادمین</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalStatus('rejected')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      approvalStatus === 'rejected'
                        ? 'bg-red-950/70 border-red-500 text-red-300 shadow-md shadow-red-950/50 ring-1 ring-red-500/50'
                        : 'bg-[#16161d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-red-400" />
                    <span>عدم نمایش (رد شده)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>جلسه دفاع پس از ثبت، جهت بررسی و تایید آموزش ارسال شده و سپس برای عموم نمایش داده خواهد شد.</span>
              </div>
            )}

            {/* Dynamic Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {visibleCols.map((col) => {
                const val = formData[col.id] ?? '';
                const isDegree = isDegreeColumn(col);
                const isDefenseType = isDefenseTypeColumn(col);
                const isLargeField = col.label.includes('عنوان') || col.label.includes('موضوع');

                // 1. Degree Field (مقطع تحصیلی: کارشناسی ارشد یا دکتری)
                if (isDegree) {
                  const currentDeg = normalizeDegreeValue(val);
                  return (
                    <div key={col.id} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>{col.label}</span>
                        <span className="text-[11px] text-emerald-400 font-normal">انتخاب از ۲ مقطع</span>
                      </label>
                      <div className="relative">
                        <select
                          value={currentDeg}
                          onChange={(e) => handleDegreeChange(col.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none transition-all cursor-pointer font-medium"
                        >
                          {DEGREE_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      </div>
                    </div>
                  );
                }

                // 2. Defense Type Field (دفاع از: پایان نامه، پروپزال، گزارش پیشرفت 1، گزارش پیشرفت 2، پیش دفاع، دفاع نهایی)
                if (isDefenseType) {
                  const currentDegree = degreeCol ? normalizeDegreeValue(formData[degreeCol.id]) : 'کارشناسی ارشد';
                  const isMaster = currentDegree === 'کارشناسی ارشد';

                  return (
                    <div key={col.id} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>{col.label}</span>
                        {isMaster ? (
                          <span className="text-[11px] text-amber-400 font-normal">
                            (در مقطع کارشناسی ارشد حتماً «پایان نامه» است)
                          </span>
                        ) : (
                          <span className="text-[11px] text-blue-400 font-normal">
                            (مراحل ۶ گانه دفاع دکتری)
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        {isMaster ? (
                          <div className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3.5 py-2 text-sm text-emerald-300 flex items-center justify-between">
                            <span className="font-semibold">پایان نامه</span>
                            <span className="text-[10px] bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 px-2 py-0.5 rounded font-mono">
                              ثابت برای ارشد
                            </span>
                          </div>
                        ) : (
                          <>
                            <select
                              value={normalizeDefenseTypeValue(val, 'دکتری')}
                              onChange={(e) => handleDefenseTypeChange(col.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none transition-all cursor-pointer font-medium"
                            >
                              {DEFENSE_TYPE_OPTIONS_PHD.map((opt) => (
                                <option key={opt} value={opt} className="bg-slate-900 text-white">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // 3. Multiline fields (عنوان پایان‌نامه و غیره)
                if (isLargeField) {
                  return (
                    <div key={col.id} className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300">
                        {col.label}
                      </label>
                      <textarea
                        value={val}
                        onChange={(e) => handleChange(col.id, e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>
                  );
                }

                // 4. Standard text fields
                return (
                  <div key={col.id} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      {col.label}
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions - Fixed at bottom */}
          <div className="flex items-center justify-end gap-3 p-3.5 sm:p-4 border-t border-slate-800 bg-[#16161c] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="py-2 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره جلسه دفاع</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
