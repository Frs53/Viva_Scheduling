import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  X, 
  ArrowRight,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { LocalDataResult } from '../services/localDataService';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (result: LocalDataResult) => void;
  onUploadFile: (file: File) => Promise<LocalDataResult>;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onUploadFile,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!isValid) {
      setErrorMessage('فرمت فایل انتخابی معتبر نیست. لطفاً یک فایل اکسل (xlsx, xls) یا CSV انتخاب کنید.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const result = await onUploadFile(selectedFile);
      onUploadSuccess(result);
      onClose();
      // Reset
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage(err.message || 'خطا در بارگذاری و پردازش فایل اکسل. لطفاً ساختار ستون‌های فایل را بررسی نمایید.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#121216] border border-slate-700/90 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#16161c]">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm sm:text-base">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            <span>بارگذاری فایل اکسل جدید (Upload Excel)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Info Banner */}
          <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3.5 flex items-start gap-3 text-emerald-200">
            <HardDrive className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-300">جایگزینی در فایل محلی سامانه</p>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                با بارگذاری فایل جدید، اطلاعات جلسات و اساتید در فایل محلی <strong className="text-white font-mono">form_defa.xlsx</strong> روی سرور بازنویسی شده و جدول سامانه فوراً به‌روزرسانی می‌شود.
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-400 bg-emerald-950/30 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-600/70 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-[#0e0e12] hover:bg-[#14141a]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3 flex flex-col items-center animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-slate-100 text-sm dir-ltr text-center truncate max-w-[280px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    حجم فایل: {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-950/30 border border-rose-800/40 transition-colors"
                >
                  انتخاب فایل دیگر
                </button>
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">
                    فایل اکسل خود را اینجا رها کنید یا کلیک نمایید
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    پشتیبانی از فرمت‌های <span className="font-mono text-emerald-300">.xlsx</span>، <span className="font-mono text-emerald-300">.xls</span> و <span className="font-mono text-emerald-300">.csv</span>
                  </p>
                </div>
                <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-700">
                  انتخاب فایل از کامپیوتر
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/50 border border-rose-700/60 text-rose-300 p-3 rounded-xl flex items-start gap-2.5 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Template Download Link */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/70 pt-3">
            <span>دریافت فایل نمونه فعلی:</span>
            <a
              href="/form_defa.xlsx"
              download="form_defa_template.xlsx"
              className="text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1"
            >
              <span>دانلود form_defa.xlsx</span>
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#16161c] border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
          >
            انصراف
          </button>

          <button
            onClick={handleUploadSubmit}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>در حال بارگذاری و تحلیل...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4" />
                <span>بارگذاری و جایگزینی فایل در سامانه</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
