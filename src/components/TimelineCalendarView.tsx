import React from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Eye,
  ChevronLeft
} from 'lucide-react';
import { ColumnDefinition, DefenseRecord, FilterValues } from '../types/defense';
import { ensureDoctorPrefix, getDefenseDateTimeScore } from '../utils/persianUtils';

interface TimelineCalendarViewProps {
  columns: ColumnDefinition[];
  records: DefenseRecord[];
  filters: FilterValues;
  onSelectRecord: (record: DefenseRecord) => void;
}

export const TimelineCalendarView: React.FC<TimelineCalendarViewProps> = ({
  columns,
  records,
  filters,
  onSelectRecord,
}) => {
  // Helper to extract field value by column keyword
  const getField = (record: DefenseRecord, keyword: string): string => {
    const col = columns.find(c => c.label.includes(keyword) || c.originalKey.includes(keyword));
    if (!col) return '';
    return String((record[col.id] as string) || (record[col.originalKey] as string) || '');
  };

  // Group filtered records by date key (e.g. "۱۴۰۵ / شهریور / ۷")
  const dateGroups = React.useMemo<Record<string, DefenseRecord[]>>(() => {
    const groups: Record<string, DefenseRecord[]> = {};

    records.forEach(rec => {
      const directDate = getField(rec, 'تاریخ دفاع') || getField(rec, 'تاریخ') || (rec['col_combined_date'] as string);
      const day = getField(rec, 'روز');
      const month = getField(rec, 'ماه');
      const year = getField(rec, 'سال');
      const dateKey = directDate || [day, month, year].filter(Boolean).join(' ') || 'نامشخص';

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(rec);
    });

    // Sort records within each date group by time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => getDefenseDateTimeScore(a, columns) - getDefenseDateTimeScore(b, columns));
    });

    return groups;
  }, [records, columns]);

  const dateEntries = React.useMemo(() => {
    return (Object.entries(dateGroups) as [string, DefenseRecord[]][]).sort((a, b) => {
      const recA = a[1][0];
      const recB = b[1][0];
      if (!recA || !recB) return 0;
      return getDefenseDateTimeScore(recA, columns) - getDefenseDateTimeScore(recB, columns);
    });
  }, [dateGroups, columns]);

  return (
    <div className="space-y-6">
      {dateEntries.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-[#111114] border border-slate-800 rounded-2xl">
          هیچ جلسه‌ای برای نمایش تقویمی یافت نشد.
        </div>
      ) : (
        dateEntries.map(([dateStr, sessionRecords]) => (
          <div 
            key={dateStr}
            className="bg-[#111114] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
          >
            {/* Date Group Header */}
            <div className="bg-[#16161a] border-b border-slate-800 p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-950/40 text-blue-400 border border-blue-800/30 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    تاریخ: {dateStr}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {sessionRecords.length} جلسه دفاع برنامه‌ریزی شده
                  </span>
                </div>
              </div>
            </div>

            {/* Sessions Cards Grid */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionRecords.map((record) => {
                const studentName = getField(record, 'دانشجو') || 'دانشجو';
                const major = getField(record, 'گرایش') || '-';
                const degree = getField(record, 'مقطع') || 'کارشناسی ارشد';
                const defenseType = getField(record, 'دفاع از') || 'پایان‌نامه';
                const time = getField(record, 'ساعت') || 'مشخص نشده';
                const rawSupervisor = getField(record, 'استاد راهنما') || '-';
                const supervisor = rawSupervisor && rawSupervisor !== '-' ? ensureDoctorPrefix(rawSupervisor) : '-';
                const isPhd = degree.includes('دکتری');

                return (
                  <div
                    key={record.id}
                    onClick={() => onSelectRecord(record)}
                    className="bg-[#16161a]/70 hover:bg-[#1a1a20] border border-slate-800 hover:border-emerald-800/60 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            isPhd
                              ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                              : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
                          }`}
                        >
                          {degree}
                        </span>

                        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/30">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{time}</span>
                        </div>
                      </div>

                      {/* Student Name */}
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">
                        {studentName}
                      </h4>

                      {/* Major & Defense Type */}
                      <p className="text-xs text-slate-400 mb-3">
                        {major} &bull; {defenseType}
                      </p>

                      {/* Supervisor */}
                      <div className="text-xs text-slate-400 border-t border-slate-800/60 pt-2 flex items-center justify-between">
                        <span>استاد راهنما:</span>
                        <span className="text-slate-200 font-medium truncate max-w-[150px]">
                          {supervisor}
                        </span>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-emerald-400 transition-colors">
                      <span>مشاهده جزئیات و داوران</span>
                      <ChevronLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
