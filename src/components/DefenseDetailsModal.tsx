import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Phone, 
  Award, 
  BookOpen, 
  Users,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Printer,
  FileText,
  ClockAlert,
  EyeOff,
  Eye
} from 'lucide-react';
import { ApprovalStatus, ColumnDefinition, DefenseRecord } from '../types/defense';
import { formatApprovalStatusPersian } from '../utils/excelParser';
import { ensureDoctorPrefix } from '../utils/persianUtils';

interface DefenseDetailsModalProps {
  record: DefenseRecord | null;
  columns: ColumnDefinition[];
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (record: DefenseRecord) => void;
  onDelete?: (recordId: string) => void;
  onToggleApproval?: (recordId: string, newStatus: ApprovalStatus) => void;
}

export const DefenseDetailsModal: React.FC<DefenseDetailsModalProps> = ({
  record,
  columns,
  onClose,
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleApproval,
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!record) return null;

  // Helper to extract field value by column keywords
  const getField = (keyword: string): string => {
    const col = columns.find(c => 
      c.label.includes(keyword) || 
      c.originalKey.includes(keyword) ||
      c.label.replace(/\s+/g, '').includes(keyword.replace(/\s+/g, ''))
    );
    if (!col) return '';
    return String((record[col.id] as string) || (record[col.originalKey] as string) || '').trim();
  };

  const studentName = getField('نام و نام خانوادگی دانشجو') || getField('دانشجو') || getField('نام و نام خانوادگی') || 'دانشجو';
  const major = getField('گرایش') || getField('رشته') || 'نامشخص';
  const degree = getField('مقطع') || 'کارشناسی ارشد';
  const defenseType = getField('دفاع از') || getField('نوع دفاع') || 'پایان‌نامه';
  const title = getField('عنوان') || getField('موضوع') || '';
  
  const combinedDate = getField('تاریخ دفاع') || getField('تاریخ');
  const day = getField('روز');
  const month = getField('ماه');
  const year = getField('سال');
  const displayDate = combinedDate || [day, month, year].filter(Boolean).join(' ') || 'مشخص نشده';
  const time = getField('ساعت') || getField('زمان');
  const phone = getField('شماره تماس') || getField('تماس') || getField('تلفن');
  const fileUrl = getField('آپلود فایل') || getField('فایل پایان نامه') || getField('لینک فایل') || getField('پایان نامه');

  const currentStatus: ApprovalStatus = record.approvalStatus || 'approved';

  // Committee members (guaranteed 'دکتر' prefix)
  const supervisor1 = ensureDoctorPrefix(getField('استاد راهنما') && !getField('استاد راهنما').includes('دوم') ? getField('استاد راهنما') : '');
  const supervisor2 = ensureDoctorPrefix(getField('استاد راهنمای دوم') || getField('استاد راهنما دوم'));
  const advisor1 = ensureDoctorPrefix(getField('استاد مشاوراول') || getField('استاد مشاور اول') || getField('مشاوراول') || getField('مشاور اول'));
  const advisor2 = ensureDoctorPrefix(getField('استاد مشاوردوم') || getField('استاد مشاور دوم') || getField('مشاوردوم') || getField('مشاور دوم'));
  const internalReferee = ensureDoctorPrefix(getField('داور داخلی') || getField('استاد داور داخلی'));
  const externalReferee1 = ensureDoctorPrefix(getField('داور خارجی اول') || getField('داور خارجی') || getField('استاد داور خارجی اول'));
  const externalReferee2 = ensureDoctorPrefix(getField('داور خارجی دوم') || getField('استاد داور خارجی دوم'));
  const observer = ensureDoctorPrefix(getField('استاد ناظر') || getField('ناظر'));

  // Copy full defense summary
  const handleCopySummary = () => {
    const summaryLines = [
      `🎓 مشخصات جلسه دفاع دانشجو: ${studentName}`,
      isAdmin ? `📌 وضعیت تایید نمایش: ${formatApprovalStatusPersian(currentStatus)}` : null,
      `📌 مقطع و گرایش: ${degree} - ${major}`,
      `📅 تاریخ دفاع: ${displayDate}`,
      `⏰ ساعت دفاع: ${time || 'مشخص نشده'}`,
      title ? `📖 موضوع: ${title}` : null,
      supervisor1 ? `👨‍🏫 استاد راهنما: ${supervisor1}` : null,
      supervisor2 ? `👨‍🏫 استاد راهنمای دوم: ${supervisor2}` : null,
      advisor1 ? `👨‍🏫 استاد مشاور: ${advisor1}` : null,
      internalReferee ? `⚖️ داور داخلی: ${internalReferee}` : null,
      externalReferee1 ? `⚖️ داور خارجی: ${externalReferee1}` : null,
      observer ? `👁️ استاد ناظر: ${observer}` : null,
      phone ? `📞 تماس دانشجو: ${phone}` : null,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(summaryLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#111116] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-right my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#16161d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {studentName}
                </h2>
                <span className="text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                  {degree}
                </span>
                <span className="text-[11px] font-medium bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {defenseType}
                </span>

                {/* Status Badge in Header (Admin only) */}
                {isAdmin && currentStatus === 'approved' && (
                  <span className="text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>تایید شده (نمایش عمومی)</span>
                  </span>
                )}
                {isAdmin && currentStatus === 'pending' && (
                  <span className="text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <ClockAlert className="w-3 h-3 text-amber-400" />
                    <span>در انتظار تایید ادمین</span>
                  </span>
                )}
                {isAdmin && currentStatus === 'rejected' && (
                  <span className="text-[11px] font-bold bg-red-950/90 text-red-300 border border-red-500/50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <EyeOff className="w-3 h-3 text-red-400" />
                    <span>عدم نمایش (رد شده)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                گرایش: <span className="text-slate-200 font-medium">{major}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopySummary}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
              title="کپی خلاصه مشخصات دفاع"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-400">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">کپی متن</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
              title="چاپ مشخصات"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">چاپ</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              title="بستن صفحه (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">

          {/* Admin Approval Quick Action Bar if Admin */}
          {isAdmin && (
            <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">مدیریت تایید نمایش جلسه توسط ادمین:</span>
                  <span className="text-[11px] text-slate-400">
                    وضعیت فعلی: <strong className="text-slate-200">{formatApprovalStatusPersian(currentStatus)}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onToggleApproval?.(record.id, 'approved')}
                  disabled={currentStatus === 'approved'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    currentStatus === 'approved'
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 opacity-90 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تأیید نمایش برای همه</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleApproval?.(record.id, 'rejected')}
                  disabled={currentStatus === 'rejected'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                    currentStatus === 'rejected'
                      ? 'bg-red-950/90 text-red-300 border border-red-600/60 opacity-90 cursor-default'
                      : 'bg-slate-800 hover:bg-red-900/40 text-red-300 border border-slate-700 hover:border-red-600/60'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>عدم نمایش (مخفی)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleApproval?.(record.id, 'pending')}
                  disabled={currentStatus === 'pending'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                    currentStatus === 'pending'
                      ? 'bg-amber-950/90 text-amber-300 border border-amber-600/60 opacity-90 cursor-default'
                      : 'bg-slate-800 hover:bg-amber-900/40 text-amber-300 border border-slate-700 hover:border-amber-600/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>انتقال به انتظار بررسی</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Thesis Title Box if exists */}
          {title && (
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>عنوان موضوع / پایان‌نامه:</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {title}
              </p>
            </div>
          )}

          {/* Key Info Cards: Date, Time, Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date Card */}
            <div className="bg-[#16161d] border border-blue-900/40 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] text-slate-400 block">تاریخ برگزاری دفاع</span>
                <span className="text-sm font-bold text-slate-100 truncate block mt-0.5">
                  {displayDate}
                </span>
              </div>
            </div>

            {/* Time Card */}
            <div className="bg-[#16161d] border border-emerald-900/40 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] text-slate-400 block">ساعت دفاع</span>
                <span className="text-sm font-bold text-emerald-300 truncate block mt-0.5">
                  {time || 'مشخص نشده'}
                </span>
              </div>
            </div>

            {/* Student Phone Card */}
            <div className="bg-[#16161d] border border-amber-900/40 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] text-slate-400 block">شماره تماس دانشجو</span>
                <span className="text-sm font-bold text-amber-300 font-mono truncate block mt-0.5" dir="ltr">
                  {phone || 'ثبت نشده'}
                </span>
              </div>
            </div>
          </div>

          {/* Committee & Professors Section */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>مشخصات اساتید و هیات محترم داوران</span>
              </h3>
              <span className="text-[11px] text-slate-400">کمیته داوری پایان‌نامه</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Supervisor 1 */}
              <div className="bg-[#16161d] border border-purple-900/30 rounded-xl p-3 flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-purple-300 font-medium block">استاد راهنما</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                    {supervisor1 || 'تعیین نشده'}
                  </span>
                </div>
              </div>

              {/* Supervisor 2 */}
              {supervisor2 && (
                <div className="bg-[#16161d] border border-purple-900/30 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-purple-300 font-medium block">استاد راهنمای دوم</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {supervisor2}
                    </span>
                  </div>
                </div>
              )}

              {/* Advisor 1 */}
              {advisor1 && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-300 font-medium block">استاد مشاور اول</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {advisor1}
                    </span>
                  </div>
                </div>
              )}

              {/* Advisor 2 */}
              {advisor2 && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-300 font-medium block">استاد مشاور دوم</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {advisor2}
                    </span>
                  </div>
                </div>
              )}

              {/* Internal Referee */}
              {internalReferee && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-teal-300 font-medium block">استاد داور داخلی</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {internalReferee}
                    </span>
                  </div>
                </div>
              )}

              {/* External Referee 1 */}
              {externalReferee1 && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-300 font-medium block">استاد داور خارجی اول</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {externalReferee1}
                    </span>
                  </div>
                </div>
              )}

              {/* External Referee 2 */}
              {externalReferee2 && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-300 font-medium block">استاد داور خارجی دوم</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {externalReferee2}
                    </span>
                  </div>
                </div>
              )}

              {/* Observer */}
              {observer && (
                <div className="bg-[#16161d] border border-slate-800/80 rounded-xl p-3 flex items-start gap-3 sm:col-span-2">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-rose-300 font-medium block">استاد ناظر تحصیلات تکمیلی</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100 block mt-0.5">
                      {observer}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thesis File / Download Link if available */}
          {fileUrl && fileUrl.startsWith('http') && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-200">فایل پیوست پایان‌نامه / پروپوزال</h4>
                  <p className="text-[11px] text-slate-400">فایل آپلود شده در گوگل درایو یا سامانه دانشگاه</p>
                </div>
              </div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30 shrink-0"
              >
                <span>مشاهده فایل</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* All Recorded Sheet Columns Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span>تمام فیلدهای ثبت شده در جدول اطلاعات</span>
            </h3>
            <div className="bg-[#16161d] border border-slate-800/90 rounded-xl divide-y divide-slate-800/70 overflow-hidden text-xs">
              {columns.map((col) => {
                const val = String((record[col.id] as string) || (record[col.originalKey] as string) || '').trim();
                if (!val) return null;
                return (
                  <div key={col.id} className="flex items-center justify-between p-2.5 px-4 hover:bg-slate-800/40">
                    <span className="text-slate-400 font-medium">{col.label}</span>
                    <span className="text-slate-200 text-left max-w-xs truncate" title={val}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#16161d] flex items-center justify-between shrink-0">
          <div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onEdit?.(record);
                    onClose();
                  }}
                  className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/60 text-blue-300 text-xs px-3.5 py-2 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>ویرایش اطلاعات</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('آیا از حذف این جلسه دفاع مطمئن هستید؟')) {
                      onDelete?.(record.id);
                      onClose();
                    }
                  }}
                  className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 text-xs px-3.5 py-2 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف جلسه</span>
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs px-5 py-2.5 rounded-xl transition-colors font-semibold flex items-center gap-1.5 border border-slate-700"
          >
            <X className="w-4 h-4" />
            <span>بستن صفحه مشخصات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
