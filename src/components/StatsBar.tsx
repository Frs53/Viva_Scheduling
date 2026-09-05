import React from 'react';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Award, 
  Filter,
  Calendar,
  ClockAlert,
  ShieldAlert
} from 'lucide-react';
import { DefenseStats } from '../types/defense';

interface StatsBarProps {
  stats: DefenseStats;
  isAdmin?: boolean;
  onFilterPending?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, isAdmin, onFilterPending }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
      {/* Total Sessions */}
      <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium">کل جلسات دفاع</span>
          <GraduationCap className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white tracking-tight">{stats.total}</span>
          <span className="text-[11px] text-slate-500">نفر دانشجو</span>
        </div>
      </div>

      {/* Pending Review / Filtered Sessions */}
      {isAdmin && (stats.pendingCount || 0) > 0 ? (
        <div 
          onClick={onFilterPending}
          className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-500 transition-colors cursor-pointer"
          title="کلیک کنید تا موارد در انتظار تایید ادمین نمایش داده شود"
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold">در انتظار تأیید ادمین</span>
            <ClockAlert className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-300 tracking-tight">{stats.pendingCount}</span>
            <span className="text-[11px] text-amber-400/80">نیاز به بررسی</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">نتایج فیلتر شده</span>
            <Filter className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-400 tracking-tight">{stats.filtered}</span>
            <span className="text-[11px] text-slate-500">مورد یافته‌شده</span>
          </div>
        </div>
      )}

      {/* Master's Count */}
      <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium">کارشناسی ارشد</span>
          <BookOpen className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-cyan-300 tracking-tight">{stats.mastersCount}</span>
          <span className="text-[11px] text-slate-500">پایان‌نامه</span>
        </div>
      </div>

      {/* PhD Count */}
      <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium">مقطع دکتری تخصصی</span>
          <Award className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-purple-300 tracking-tight">{stats.phdCount}</span>
          <span className="text-[11px] text-slate-500">رساله / پروپزال</span>
        </div>
      </div>

      {/* Departments Count */}
      <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium">گرایش‌های تحصیلی</span>
          <Users className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-amber-300 tracking-tight">{stats.departmentsCount}</span>
          <span className="text-[11px] text-slate-500">گرایش مختلف</span>
        </div>
      </div>

      {/* Scheduled Dates */}
      <div className="bg-[#111114] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium">روزهای برنامه‌ریزی</span>
          <Calendar className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-blue-300 tracking-tight">{stats.upcomingDatesCount}</span>
          <span className="text-[11px] text-slate-500">تاریخ مجزا</span>
        </div>
      </div>
    </div>
  );
};
