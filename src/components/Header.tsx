import React from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Printer, 
  RotateCcw, 
  Cloud, 
  CalendarDays,
  Table as TableIcon,
  Lock,
  LogOut,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  Users,
  UploadCloud
} from 'lucide-react';
import { AppUser } from '../types/user';

interface HeaderProps {
  onOpenDriveModal?: () => void;
  onOpenLocalFileModal?: () => void;
  onOpenUploadModal?: () => void;
  onQuickSyncDrive?: () => void;
  isSyncingDrive?: boolean;
  onExportExcel: () => void;
  onResetFilters: () => void;
  onPrint: () => void;
  activeFilterCount: number;
  totalCount: number;
  filteredCount: number;
  viewMode: 'table' | 'timeline';
  onToggleViewMode: (mode: 'table' | 'timeline') => void;
  sourceName?: string;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onAddNewRecord?: () => void;
  // User Registration & Auth
  onRegisterNewDefense: () => void;
  currentUser: AppUser | null;
  onLogoutUser: () => void;
  onOpenAdminUserManagement: () => void;
  // Auto-refresh properties
  isAutoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  refreshCountdown?: number;
  lastSyncedTime?: Date | null;
  isConnectedToDrive?: boolean;
  isPermanentAccess?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDriveModal,
  onOpenLocalFileModal,
  onOpenUploadModal,
  onQuickSyncDrive,
  isSyncingDrive,
  onExportExcel,
  onResetFilters,
  onPrint,
  activeFilterCount,
  filteredCount,
  viewMode,
  onToggleViewMode,
  isAdmin,
  onOpenAdminLogin,
  onLogoutAdmin,
  onRegisterNewDefense,
  currentUser,
  onLogoutUser,
  onOpenAdminUserManagement,
  isConnectedToDrive,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0c0c10] px-4 sm:px-6 py-4 no-print sticky top-0 z-30 backdrop-blur-md">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl text-emerald-400 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                سامانه مدیریت و زمان‌بندی جلسات دفاع
              </h1>
              {isAdmin && (
                <div className="flex items-center gap-1.5 bg-amber-950/60 text-amber-300 px-2.5 py-0.5 rounded-full text-xs border border-amber-600/50 font-semibold animate-fadeIn">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>دسترسی ادمین فعال</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Manual Sync */}
          <button
            onClick={onQuickSyncDrive || onOpenLocalFileModal}
            disabled={isSyncingDrive}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-950/50 disabled:opacity-50"
            title="بروزرسانی داده‌ها از فایل محلی"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'در حال بازخوانی...' : 'بازخوانی فایل محلی'}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#16161a] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onToggleViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای جدول جامع"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
            <button
              onClick={() => onToggleViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای زمان‌بندی بر اساس تاریخ"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>تقویم زمان‌بندی</span>
            </button>
          </div>

          {/* Upload Excel Button */}
          {onOpenUploadModal && (
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border bg-[#16161a] hover:bg-slate-800 border-slate-700 hover:border-emerald-600/60 text-slate-200 hover:text-emerald-300 shadow-sm"
              title="بارگذاری فایل اکسل جدید و جایگزینی داده‌ها در سامانه"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>بارگذاری اکسل</span>
            </button>
          )}

          {/* Local Excel File & Permanent Link Button */}
          <button
            onClick={onOpenLocalFileModal || onOpenDriveModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border bg-[#16161a] hover:bg-slate-800 border-emerald-600/50 text-emerald-300 hover:text-emerald-200 shadow-sm"
            title="مشاهده و دانلود فایل اکسل محلی و دریافت لینک دائم"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>فایل اکسل محلی (لینک دائم)</span>
          </button>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 px-3 py-2 rounded-lg text-xs font-medium transition-all animate-fadeIn"
              title="پاک کردن تمام فیلترهای فعال"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>پاکسازی فیلترها ({activeFilterCount})</span>
            </button>
          )}

          {/* Export to Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/60 text-emerald-300 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            title="دانلود اکسل فیلتر شده"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>خروجی اکسل ({filteredCount})</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-all border border-slate-700"
            title="چاپ برنامه زمان‌بندی"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ / PDF</span>
          </button>

          {/* New Defense Registration Button */}
          <button
            onClick={onRegisterNewDefense}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]"
            title="ثبت جلسه دفاع جدید (ورود دانشجو یا استاد)"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ثبت دفاع جدید</span>
          </button>

          {/* Current Logged In User Chip (if Student or Professor) */}
          {currentUser && !isAdmin && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs animate-fadeIn">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-slate-300 font-medium">
                {currentUser.role === 'professor' ? 'استاد: ' : 'دانشجو: '}
                <strong className="text-white">{currentUser.fullName}</strong>
              </span>
              <button
                onClick={onLogoutUser}
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors mr-1"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Admin User Management Button (in Admin mode) */}
          {isAdmin && (
            <button
              onClick={onOpenAdminUserManagement}
              className="flex items-center gap-1.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/60 text-purple-300 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="تعریف کاربر دانشجو یا استاد جدید و ویرایش لیست اساتید"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>مدیریت کاربران و اساتید</span>
            </button>
          )}

          {/* Admin Login / Logout Button */}
          {isAdmin ? (
            <button
              onClick={onLogoutAdmin}
              className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              title="خروج از حساب مدیریت"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>خروج ادمین</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="ورود با نام کاربری و رمز ادمین"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>ورود ادمین</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
