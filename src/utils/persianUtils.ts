/**
 * Utility functions for Persian text processing, normalization, and search matching.
 */
import { ColumnDefinition, DefenseRecord } from '../types/defense';

export function normalizePersian(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  const text = String(str);
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic vowel signs / diacritics
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces & non-breaking spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Converts Persian/Arabic digits to English digits
 */
export function toEnglishDigits(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/[۰٠]/g, '0')
    .replace(/[۱١]/g, '1')
    .replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3')
    .replace(/[۴٤]/g, '4')
    .replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6')
    .replace(/[۷٧]/g, '7')
    .replace(/[۸٨]/g, '8')
    .replace(/[۹٩]/g, '9');
}

/**
 * Persian calendar months mapping to their 1-12 index
 */
const PERSIAN_MONTHS: Record<string, number> = {
  'فروردین': 1,
  'اردیبهشت': 2,
  'خرداد': 3,
  'تیر': 4,
  'مرداد': 5,
  'امرداد': 5,
  'شهریور': 6,
  'مهر': 7,
  'آبان': 8,
  'آذر': 9,
  'دی': 10,
  'بهمن': 11,
  'اسفند': 12,
};

/**
 * Parses a Persian month from text or number
 */
export function parsePersianMonth(monthVal?: string | number | null): number {
  if (monthVal === undefined || monthVal === null) return 0;
  const rawStr = String(monthVal).trim();
  const cleaned = normalizePersian(rawStr);
  const engDigits = toEnglishDigits(cleaned);
  const num = parseInt(engDigits, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;

  for (const [name, mNum] of Object.entries(PERSIAN_MONTHS)) {
    const normName = normalizePersian(name);
    if (cleaned.includes(normName) || normName.includes(cleaned)) {
      return mNum;
    }
  }
  return 0;
}

/**
 * Calculates a comparable chronological timestamp score for a defense record (YYYYMMDDHHmm)
 */
export function getDefenseDateTimeScore(record: DefenseRecord, _columns?: ColumnDefinition[]): number {
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;

  // 1. Search across record fields for separate day, month, year, time
  for (const key of Object.keys(record)) {
    const normKey = normalizePersian(key);
    const val = record[key];
    if (val === undefined || val === null || val === '') continue;

    if ((normKey.includes('سال') || normKey.includes('year')) && !year) {
      const parsedYear = parseInt(toEnglishDigits(String(val)), 10);
      if (!isNaN(parsedYear) && parsedYear > 1300 && parsedYear < 1500) {
        year = parsedYear;
      }
    }

    if ((normKey.includes('ماه') || normKey.includes('month')) && !month) {
      const parsedMonth = parsePersianMonth(val);
      if (parsedMonth > 0) {
        month = parsedMonth;
      }
    }

    if ((normKey.includes('روز') || normKey.includes('day')) && !day) {
      const parsedDay = parseInt(toEnglishDigits(String(val)), 10);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
        day = parsedDay;
      }
    }

    if ((normKey.includes('ساعت') || normKey.includes('time') || normKey.includes('زمان')) && !hour && !minute) {
      const timeStr = toEnglishDigits(String(val)).trim();
      const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{1,2}))?/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10) || 0;
        minute = parseInt(timeMatch[2] || '0', 10) || 0;
      }
    }
  }

  // 2. If year, month, or day missing, inspect combined date fields
  if (!year || !month || !day) {
    const combinedVal = String(
      record['col_combined_date'] ||
      record['تاریخ دفاع'] ||
      record['تاریخ'] ||
      record['date'] ||
      ''
    ).trim();

    if (combinedVal) {
      const engDate = toEnglishDigits(combinedVal);

      // Match pattern like "7 شهریور 1405" or "15 شهریور 1405"
      const textDateMatch = engDate.match(/(\d{1,2})\s+([^\d\s]+)\s+(\d{4})/);
      if (textDateMatch) {
        if (!day) day = parseInt(textDateMatch[1], 10);
        if (!month) month = parsePersianMonth(textDateMatch[2]);
        if (!year) year = parseInt(textDateMatch[3], 10);
      } else {
        // Match YYYY/MM/DD or YYYY-MM-DD
        const slashMatch1 = engDate.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (slashMatch1) {
          if (!year) year = parseInt(slashMatch1[1], 10);
          if (!month) month = parseInt(slashMatch1[2], 10);
          if (!day) day = parseInt(slashMatch1[3], 10);
        } else {
          // Match DD/MM/YYYY
          const slashMatch2 = engDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
          if (slashMatch2) {
            if (!day) day = parseInt(slashMatch2[1], 10);
            if (!month) month = parseInt(slashMatch2[2], 10);
            if (!year) year = parseInt(slashMatch2[3], 10);
          }
        }
      }
    }
  }

  // Fallback default year if only month and day are present
  if (!year && (month || day)) {
    year = 1405;
  }

  // If no date at all, return large number so it ranks at the end
  if (!year && !month && !day) {
    return 999999999999;
  }

  return year * 100000000 + month * 1000000 + day * 10000 + hour * 100 + minute;
}

/**
 * Sorts defense records chronologically by defense date and time
 */
export function sortRecordsByDefenseDate(
  records: DefenseRecord[],
  columns?: ColumnDefinition[],
  ascending: boolean = true
): DefenseRecord[] {
  return [...records].sort((a, b) => {
    const scoreA = getDefenseDateTimeScore(a, columns);
    const scoreB = getDefenseDateTimeScore(b, columns);
    return ascending ? scoreA - scoreB : scoreB - scoreA;
  });
}

/**
 * Checks if a column key or label represents an academic / professor / referee / advisor field
 */
export function isProfessorColumn(colNameOrLabel?: string | null): boolean {
  if (!colNameOrLabel) return false;
  const name = colNameOrLabel.trim().toLowerCase();
  return (
    name.includes('راهنما') ||
    name.includes('مشاور') ||
    name.includes('داور') ||
    name.includes('ناظر') ||
    name.includes('استاد') ||
    name.includes('هیأت') ||
    name.includes('هیات') ||
    name.includes('supervisor') ||
    name.includes('advisor') ||
    name.includes('referee') ||
    name.includes('examiner')
  );
}

/**
 * Ensures a professor / academic member's name has the "دکتر" title.
 * If "دکتر" is missing, inserts it appropriately in Persian format.
 */
export function ensureDoctorPrefix(rawName?: string | null): string {
  if (rawName === undefined || rawName === null) return '';
  const trimmed = String(rawName).trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'ندارد' || trimmed === 'نامشخص' || trimmed === 'null' || trimmed === 'undefined') {
    return trimmed;
  }

  // If already contains دکتر or دكتر, keep as is
  if (trimmed.includes('دکتر') || trimmed.includes('دكتر')) {
    return trimmed;
  }

  // Handle common polite Persian prefixes
  if (/^جناب\s*اق?ای\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^جناب\s*اق?ای\s+/i, '').trim();
    return `جناب آقای دکتر ${rest}`;
  }
  if (/^(سرکار\s*)?خانم\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^(سرکار\s*)?خانم\s+/i, '').trim();
    return `سرکار خانم دکتر ${rest}`;
  }
  if (/^اق?ای\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^اق?ای\s+/i, '').trim();
    return `آقای دکتر ${rest}`;
  }
  if (/^مهندس\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^مهندس\s+/i, '').trim();
    return `دکتر ${rest}`;
  }

  return `دکتر ${trimmed}`;
}

/**
 * Checks if target string contains the search query with Persian normalization
 * Matches any token if multiple tokens are provided, or partial substring.
 */
export function matchesPersian(target?: string | number | null, query?: string): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  const normTarget = normalizePersian(target);
  const normQuery = normalizePersian(query);

  if (normTarget.includes(normQuery)) return true;

  // Check if all individual words in the query exist in the target
  const queryTokens = normQuery.split(' ').filter(Boolean);
  if (queryTokens.length > 1) {
    return queryTokens.every(token => normTarget.includes(token));
  }

  return false;
}

/**
 * Extracts standard professor role title from column label
 * Examples:
 * - "نام و نام خانوادگی استاد راهنما" -> "استاد راهنما"
 * - "نام و نام خانوادگی استاد راهنمای دوم - در صورت وجود" -> "استاد راهنمای دوم"
 * - "نام و نام خانوادگی استاد مشاوراول - در صورت وجود" -> "استاد مشاور اول"
 * - "نام و نام خانوادگی استاد داور داخلی" -> "داور داخلی"
 * - "نام و نام خانوادگی استاد داور خارجی اول" -> "داور خارجی اول"
 * - "نام و نام خانوادگی استاد ناظر" -> "استاد ناظر"
 */
export function getProfessorRoleFromColumnHeader(header: string): string {
  if (!header) return 'استاد';
  const clean = header
    .replace(/نام\s*و\s*نام\s*خانوادگی/g, '')
    .replace(/\(در\s*صورت\s*وجود\)/g, '')
    .replace(/-?\s*در\s*صورت\s*وجود/g, '')
    .replace(/[-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const norm = normalizePersian(clean);

  if (norm.includes('راهنمای دوم') || norm.includes('راهنما دوم')) return 'استاد راهنمای دوم';
  if (norm.includes('راهنما')) return 'استاد راهنما';
  if (norm.includes('مشاور اول') || norm.includes('مشاوراول')) return 'استاد مشاور اول';
  if (norm.includes('مشاور دوم') || norm.includes('مشاوردوم')) return 'استاد مشاور دوم';
  if (norm.includes('مشاور')) return 'استاد مشاور';
  if (norm.includes('داور داخلی')) return 'داور داخلی';
  if (norm.includes('داور خارجی اول') || norm.includes('داور خارجی 1')) return 'داور خارجی اول';
  if (norm.includes('داور خارجی دوم') || norm.includes('داور خارجی 2')) return 'داور خارجی دوم';
  if (norm.includes('داور خارجی')) return 'داور خارجی';
  if (norm.includes('داور')) return 'داور';
  if (norm.includes('ناظر')) return 'استاد ناظر';
  if (norm.includes('نماینده')) return 'نماینده تحصیلات تکمیلی';

  return clean || 'استاد';
}

/**
 * Extracts student name from a defense record
 */
export function getStudentRecordName(record: DefenseRecord, columns?: ColumnDefinition[]): string {
  if (columns) {
    const studentCol = columns.find(c => 
      c.label.includes('دانشجو') || 
      c.originalKey.includes('دانشجو') ||
      c.label.includes('نام و نام خانوادگی دانشجو')
    );
    if (studentCol) {
      const val = record[studentCol.id] || record[studentCol.originalKey];
      if (val) return String(val).trim();
    }
  }

  for (const key of Object.keys(record)) {
    const norm = normalizePersian(key);
    if (norm.includes('دانشجو') && !norm.includes('شماره') && !norm.includes('تلفن') && !norm.includes('مقطع') && !norm.includes('گرایش')) {
      const val = record[key];
      if (val) return String(val).trim();
    }
  }

  return String(record['نام و نام خانوادگی دانشجو'] || record['نام دانشجو'] || record['دانشجو'] || '—');
}

/**
 * Extracts defense date formatted cleanly in Persian
 */
export function getDefenseRecordDate(record: DefenseRecord, columns?: ColumnDefinition[]): string {
  if (record['col_combined_date']) {
    return String(record['col_combined_date']).trim();
  }

  if (columns) {
    const dateCol = columns.find(c => 
      c.label.includes('تاریخ دفاع') || 
      c.label.includes('تاریخ') || 
      c.originalKey.includes('تاریخ دفاع')
    );
    if (dateCol) {
      const val = record[dateCol.id] || record[dateCol.originalKey];
      if (val) return String(val).trim();
    }
  }

  let day = '';
  let month = '';
  let year = '';
  for (const key of Object.keys(record)) {
    const norm = normalizePersian(key);
    if ((norm.includes('روز') || norm.includes('day')) && !day) {
      day = String(record[key]).trim();
    }
    if ((norm.includes('ماه') || norm.includes('month')) && !month) {
      month = String(record[key]).trim();
    }
    if ((norm.includes('سال') || norm.includes('year')) && !year) {
      year = String(record[key]).trim();
    }
  }

  if (day || month || year) {
    return [day, month, year].filter(Boolean).join(' ');
  }

  return String(record['تاریخ دفاع'] || record['تاریخ'] || '—');
}

/**
 * Extracts defense time formatted cleanly
 */
export function getDefenseRecordTime(record: DefenseRecord, columns?: ColumnDefinition[]): string {
  if (columns) {
    const timeCol = columns.find(c => 
      c.label.includes('ساعت') || 
      c.originalKey.includes('ساعت') || 
      c.label.includes('زمان')
    );
    if (timeCol) {
      const val = record[timeCol.id] || record[timeCol.originalKey];
      if (val) return String(val).trim();
    }
  }

  for (const key of Object.keys(record)) {
    const norm = normalizePersian(key);
    if (norm.includes('ساعت') || norm.includes('time')) {
      const val = record[key];
      if (val) return String(val).trim();
    }
  }

  return String(record['ساعت'] || record['ساعت دفاع'] || '—');
}

