import React, { useState } from 'react';
import { FileSpreadsheet, Download, Copy, Check, ExternalLink, HardDrive, RefreshCw, X, UploadCloud } from 'lucide-react';

interface LocalFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  onOpenUploadModal?: () => void;
  isRefreshing?: boolean;
  totalRecords: number;
}

export const LocalFileModal: React.FC<LocalFileModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onOpenUploadModal,
  isRefreshing,
  totalRecords,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const permanentUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/form_defa.xlsx` 
    : '/form_defa.xlsx';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(permanentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#121216] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#16161c]">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm sm:text-base">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <span>فایل اکسل محلی سامانه (form_defa.xlsx)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Status Alert */}
          <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3.5 flex items-start gap-3 text-emerald-200">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-300">ذخیره و بازیابی محلی فعال است</p>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                تمامی اطلاعات و جلسات دفاع ({totalRecords} رکورد) به همراه کاربران در فایل محلی <strong className="text-white font-mono">form_defa.xlsx</strong> روی سرور نگهداری شده و از این فایل بارگذاری می‌شوند.
              </p>
            </div>
          </div>

          {/* Permanent Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>لینک دائم فایل محلی (دسترسی مستقیم):</span>
              {copied && <span className="text-emerald-400 font-normal">کپی شد!</span>}
            </label>
            <div className="flex items-center gap-2 bg-[#0c0c10] border border-slate-700 rounded-xl p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={permanentUrl}
                className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none select-all dir-ltr text-left"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
                title="کپی کردن لینک دائم فایل"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span>{copied ? 'کپی شد' : 'کپی لینک'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href="/form_defa.xlsx"
              download="form_defa.xlsx"
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/50"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل form_defa.xlsx</span>
            </a>

            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'در حال بازخوانی...' : 'بازخوانی مجدد از فایل'}</span>
            </button>
          </div>

          {onOpenUploadModal && (
            <div className="pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#181820] hover:bg-[#20202a] text-emerald-400 hover:text-emerald-300 border border-emerald-600/40 hover:border-emerald-500/70 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>بارگذاری و جایگزینی فایل اکسل جدید (Upload)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#16161c] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
