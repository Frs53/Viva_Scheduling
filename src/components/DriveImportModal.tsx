import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Upload, 
  FileSpreadsheet, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Loader2,
  Search,
  RefreshCw,
  Zap,
  LogIn,
  ShieldCheck,
  ExternalLink,
  Trash2,
  HelpCircle,
  Copy
} from 'lucide-react';
import { parseGoogleDriveUrl, fetchFileFromUrl } from '../utils/googleDrive';
import { parseExcelOrCsvData } from '../utils/excelParser';
import { RAW_SAMPLE_CSV } from '../data/sampleData';
import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { AppUser } from '../types/user';
import { 
  workspaceService, 
  DriveFileItem, 
  TARGET_FILE_NAME,
  PermanentAccessConfig
} from '../services/googleWorkspaceService';

interface DriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: {
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
    users?: AppUser[];
  }) => void;
}

export const DriveImportModal: React.FC<DriveImportModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'permanent' | 'gdrive' | 'upload'>('permanent');
  const [driveUrl, setDriveUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Permanent Access State
  const [permanentConfig, setPermanentConfig] = useState<PermanentAccessConfig>(
    workspaceService.getPermanentAccess()
  );

  // Google Drive Live State
  const [isConnected, setIsConnected] = useState<boolean>(workspaceService.isConnected());
  const [searchQuery, setSearchQuery] = useState(TARGET_FILE_NAME);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const pConfig = workspaceService.getPermanentAccess();
      setPermanentConfig(pConfig);
      setIsConnected(workspaceService.isConnected());
      setErrorMsg(null);
      setSuccessMsg(null);
      if (pConfig.url) {
        setDriveUrl(pConfig.url);
      } else if (pConfig.fileId) {
        setDriveUrl(pConfig.fileId);
      }
      if (workspaceService.getAccessToken()) {
        handleSearchDrive();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Save Permanent Access via Link / File ID
  const handleSavePermanentAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!driveUrl.trim()) {
      setErrorMsg('لطفاً لینک اشتراک‌گذاری یا شناسه فایل form_defa.xlsx را وارد نمایید.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = parseGoogleDriveUrl(driveUrl);
      const fileId = parsed.fileId || driveUrl.trim();

      // Test fetch first to ensure access works
      const data = await workspaceService.fetchDriveFile(fileId, TARGET_FILE_NAME);
      if (data.records.length === 0) {
        throw new Error('فایل یافت شد اما هیچ سطر داده‌ای در آن وجود ندارد.');
      }

      // Save permanently
      workspaceService.setPermanentAccess(fileId, driveUrl.trim(), TARGET_FILE_NAME);
      setPermanentConfig(workspaceService.getPermanentAccess());
      setIsConnected(true);

      setSuccessMsg(`دسترسی دائمی به «${TARGET_FILE_NAME}» با موفقیت فعال شد (${data.records.length} رکورد همگام‌سازی گردید).`);
      onDataLoaded(data);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          'خطا در برقراری ارتباط با فایل. لطفاً مطمئن شوید دسترسی فایل در گوگل درایو روی «Anyone with the link (هر کسی دارای پیوند)» قرار دارد.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Remove Permanent Access
  const handleClearPermanentAccess = () => {
    workspaceService.clearPermanentAccess();
    setPermanentConfig(workspaceService.getPermanentAccess());
    setDriveUrl('');
    setSuccessMsg('تنظیمات دسترسی دائمی حذف گردید.');
  };

  // 3. Connect to Google OAuth with Silent Auto-Renewal
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await workspaceService.requestOAuthToken();
      setIsConnected(true);
      setSuccessMsg('اتصال به حساب گوگل با موفقیت برقرار شد. توکن به صورت خودکار در پس‌زمینه تمدید خواهد شد.');
      await handleSearchDrive();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'خطا در احراز هویت با حساب گوگل.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Search Drive
  const handleSearchDrive = async (customQuery?: string) => {
    setIsSearchingDrive(true);
    setErrorMsg(null);
    try {
      const q = customQuery !== undefined ? customQuery : searchQuery;
      const files = await workspaceService.searchDefenseFiles(q);
      setDriveFiles(files);
      if (files.length === 0) {
        setErrorMsg(`فایلی با نام «${q}» در گوگل درایو یافت نشد.`);
      } else {
        setSelectedFileId(files[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'خطا در جستجوی فایل‌ها در گوگل درایو.');
    } finally {
      setIsSearchingDrive(false);
    }
  };

  // 5. Load selected file from Drive and optionally set as permanent
  const handleLoadDriveFile = async (file: DriveFileItem, makePermanent = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await workspaceService.fetchDriveFile(file.id, file.name, file.mimeType);
      if (data.records.length === 0) {
        throw new Error('فایل انتخاب شده حاوی هیچ سطر داده‌ای نیست.');
      }

      if (makePermanent) {
        workspaceService.setPermanentAccess(file.id, undefined, file.name);
        setPermanentConfig(workspaceService.getPermanentAccess());
      } else {
        workspaceService.saveActiveFile(file.id, file.name);
      }

      onDataLoaded(data);
      setSuccessMsg(`اطلاعات از «${file.name}» با موفقیت بارگذاری شد.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'خطا در خواندن اطلاعات فایل از گوگل درایو.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Local file upload
  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('فایل خالی است');

        const result = parseExcelOrCsvData(data as ArrayBuffer);
        if (result.records.length === 0) {
          throw new Error('هیچ سطری در فایل اکسل یافت نشد.');
        }

        onDataLoaded({
          ...result,
          sourceName: file.name,
        });
        setIsLoading(false);
        onClose();
      } catch (err: any) {
        console.error(err);
        setErrorMsg('خطا در خواندن فایل: ' + (err.message || 'فرمت نامعتبر'));
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('خطا در خواندن فایل');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#101014] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#141418]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-700/40 rounded-xl text-cyan-400">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>تنظیمات دسترسی دائمی به فایل</span>
                <span className="text-cyan-400 font-mono text-xs bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {TARGET_FILE_NAME}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                برقراری ارتباط پایدار و همگام‌سازی خودکار هر ۲۰ ثانیه بدون وقفه
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#121216] px-4 gap-2">
          <button
            onClick={() => setActiveTab('permanent')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'permanent'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>دسترسی دائمی ۲۴/۷ (پیشنهادی)</span>
          </button>
          <button
            onClick={() => setActiveTab('gdrive')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'gdrive'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>حساب Google Drive (تمدید خودکار)</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>آپلود فایل اکسل (آفلاین)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PERMANENT ACCESS VIA DIRECT/SHARED LINK (24/7 WITHOUT TOKEN EXPIRATION) */}
          {activeTab === 'permanent' && (
            <div className="space-y-4">
              {/* Permanent status card */}
              {permanentConfig.isConfigured ? (
                <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900/60 border border-emerald-600/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">دسترسی دائمی فعال است</span>
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] px-2 py-0.2 rounded-full font-medium">
                          ۲۴ ساعته فعال
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        سامانه هر ۲۰ ثانیه بدون وقفه فایل <span className="text-emerald-400 font-mono font-semibold">{permanentConfig.fileName}</span> را از گوگل درایو می‌خواند.
                      </p>
                      {permanentConfig.fileId && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 font-mono" dir="ltr">
                          <span className="text-slate-500">File ID:</span>
                          <span className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                            {permanentConfig.fileId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleSavePermanentAccess()}
                      disabled={isLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>همگام‌سازی فوری</span>
                    </button>
                    <button
                      onClick={handleClearPermanentAccess}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-2 rounded-lg text-xs transition-colors"
                      title="قطع دسترسی دائمی"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Form to enter Permanent Link / File ID */}
              <div className="bg-[#141418] border border-slate-800 rounded-xl p-4.5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-cyan-400" />
                    <span>پیوند اشتراک‌گذاری یا شناسه فایل form_defa.xlsx در Google Drive</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    با ثبت لینک عمومی فایل در کادر زیر، سامانه به صورت <strong className="text-cyan-300">دائمی و بدون نیاز به ورود مجدد</strong> در تمام ساعات شبانه‌روز داده‌ها را هر ۲۰ ثانیه دریافت خواهد کرد.
                  </p>
                </div>

                <form onSubmit={handleSavePermanentAccess} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... یا شناسه فایل Google Drive"
                      className="w-full bg-[#18181e] border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-left"
                      dir="ltr"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isLoading || !driveUrl.trim()}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>ثبت و فعال‌سازی دسترسی دائمی ۲۴ ساعته</span>
                    </button>

                    {driveUrl && (
                      <button
                        type="button"
                        onClick={() => setDriveUrl('')}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        پاک کردن
                      </button>
                    )}
                  </div>
                </form>

                {/* Step-by-step Persian tutorial */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>چگونه در گوگل درایو دسترسی دائمی ایجاد کنیم؟ (۳ مرحله ساده)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pr-1">
                    <li>
                      در گوگل درایو روی فایل <code className="text-emerald-400 font-mono">form_defa.xlsx</code> راست کلیک کرده و گزینه <strong className="text-white">Share (اشتراک‌گذاری)</strong> را بزنید.
                    </li>
                    <li>
                      در پنجره باز شده، بخش <strong className="text-white">General access</strong> را از حالت Restricted به <strong className="text-cyan-300">Anyone with the link (هر کسی پیوند را دارد)</strong> با دسترسی <strong className="text-white">Viewer (مشاهده‌کننده)</strong> تغییر دهید.
                    </li>
                    <li>
                      دکمه <strong className="text-white">Copy link (کپی پیوند)</strong> را بزنید و در کادر بالا درج کنید، سپس دکمه «ثبت و فعال‌سازی» را فشار دهید.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE LIVE SEARCH & SILENT AUTO-RENEWAL */}
          {activeTab === 'gdrive' && (
            <div className="space-y-4">
              {!isConnected ? (
                <div className="bg-[#16161a] border border-slate-800 rounded-xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">اتصال مستقیم به Google Drive با حساب گوگل</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      با احراز هویت حساب گوگل، فایل‌های درایو جستجو شده و توکن به صورت هوشمند در پس‌زمینه تمدید می‌شود.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>ورود با Google و جستجوی form_defa.xlsx</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">حساب گوگل درایو متصل است (تمدید خودکار توکن فعال)</span>
                    </div>
                    <button
                      onClick={() => handleSearchDrive()}
                      disabled={isSearchingDrive}
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSearchingDrive ? 'animate-spin' : ''}`} />
                      <span>جستجوی مجدد</span>
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchDrive(searchQuery)}
                        placeholder="نام فایل (form_defa.xlsx)..."
                        className="w-full bg-[#16161a] border border-slate-700 rounded-xl px-3.5 py-2.5 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-left"
                        dir="ltr"
                      />
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                    <button
                      onClick={() => handleSearchDrive(searchQuery)}
                      disabled={isSearchingDrive}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {isSearchingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : 'جستجو'}
                    </button>
                  </div>

                  {/* Search results list */}
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selectedFileId === file.id
                            ? 'bg-blue-950/40 border-blue-600/60 text-white'
                            : 'bg-[#16161a] border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5 font-mono">
                              <span>{file.name}</span>
                              {file.name.includes('form_defa') && (
                                <span className="bg-emerald-950 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-800/40">
                                  فایل هدف
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {file.modifiedTime ? `آخرین تغییر: ${new Date(file.modifiedTime).toLocaleDateString('fa-IR')}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleLoadDriveFile(file, true)}
                            disabled={isLoading}
                            className="bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="تنظیم به عنوان فایل دائمی سامانه"
                          >
                            <Zap className="w-3 h-3" />
                            <span>انتخاب دائمی</span>
                          </button>
                          <button
                            onClick={() => handleLoadDriveFile(file, false)}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                          >
                            بارگذاری
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCAL EXCEL FILE UPLOAD (OFFLINE) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-[#16161a]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  آپلود دستی فایل form_defa.xlsx
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  فایل اکسل را بکشید و رها کنید یا از حافظه سیستم انتخاب نمایید
                </p>
                <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-emerald-900/30">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>انتخاب فایل اکسل</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#121216] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>پشتیبانی کامل از اکسل (xlsx)، گوگل شیت و گوگل فرم</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
