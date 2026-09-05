import * as XLSX from 'xlsx';
import { ApprovalStatus, ColumnDefinition, DefenseRecord, isExcludedColumn } from '../types/defense';
import { AppUser } from '../types/user';
import { getStoredUsers } from '../data/defaultUsers';
import { ensureDoctorPrefix, isProfessorColumn, sortRecordsByDefenseDate } from './persianUtils';

export interface ParseResult {
  columns: ColumnDefinition[];
  records: DefenseRecord[];
  excludedColumnNames: string[];
  users?: AppUser[];
}

/**
 * Checks if a header represents approval/display status
 */
function isApprovalColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized.includes('وضعیت تایید') ||
    normalized.includes('تایید نمایش') ||
    normalized.includes('وضعیت نمایش') ||
    normalized.includes('تاییدیه') ||
    normalized.includes('approval')
  );
}

/**
 * Normalize approval string to typed ApprovalStatus
 */
export function normalizeApprovalStatus(rawVal?: string | null): ApprovalStatus {
  if (!rawVal) return 'approved';
  const val = String(rawVal).trim().toLowerCase();
  if (val.includes('انتظار') || val.includes('pending') || val.includes('بررسی')) {
    return 'pending';
  }
  if (val.includes('عدم') || val.includes('مخفی') || val.includes('رد') || val.includes('reject') || val.includes('hide')) {
    return 'rejected';
  }
  return 'approved';
}

export function formatApprovalStatusPersian(status?: ApprovalStatus): string {
  switch (status) {
    case 'pending':
      return 'در انتظار تایید ادمین';
    case 'rejected':
      return 'عدم نمایش (رد شده)';
    case 'approved':
    default:
      return 'تایید شده (قابل نمایش)';
  }
}

/**
 * Checks if a header represents day of defense
 */
function isDayColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized.includes('روز دفاع') ||
    normalized.includes('روز') ||
    normalized.includes('انتخاب روز')
  );
}

/**
 * Checks if a header represents month of defense
 */
function isMonthColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized.includes('ماه دفاع') ||
    normalized.includes('ماه') ||
    normalized.includes('انتخاب ماه')
  );
}

/**
 * Checks if a header represents year of defense
 */
function isYearColumn(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized.includes('سال دفاع') ||
    normalized.includes('سال') ||
    normalized.includes('انتخاب سال')
  );
}

/**
 * Formats day, month, year into a unified clean Persian date string
 * Example: "۷ شهریور ۱۴۰۵"
 */
function formatCombinedPersianDate(day?: string | number, month?: string | number, year?: string | number): string {
  const d = day !== undefined && day !== null ? String(day).trim() : '';
  const m = month !== undefined && month !== null ? String(month).trim() : '';
  const y = year !== undefined && year !== null ? String(year).trim() : '';

  const parts = [];
  if (d) parts.push(d);
  if (m) parts.push(m);
  if (y) parts.push(y);

  return parts.join(' ');
}

/**
 * Parses raw data (CSV string, File, or ArrayBuffer) into structured DefenseRecords and Columns.
 */
export function parseExcelOrCsvData(
  data: string | ArrayBuffer | Uint8Array,
  defaultStatusForNew: ApprovalStatus = 'approved'
): ParseResult {
  let workbook: XLSX.WorkBook;

  if (typeof data === 'string') {
    workbook = XLSX.read(data, { type: 'string', raw: false });
  } else {
    workbook = XLSX.read(data, { type: 'array', raw: false });
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Check if a users sheet exists in workbook (e.g. کاربران, کاربران و اساتید, Users)
  let parsedUsers: AppUser[] | undefined = undefined;
  const userSheetName = workbook.SheetNames.find(name => {
    const norm = name.trim().toLowerCase();
    return norm.includes('کاربر') || norm.includes('user') || norm.includes('اساتید');
  });

  if (userSheetName && userSheetName !== firstSheetName) {
    try {
      const userSheet = workbook.Sheets[userSheetName];
      const userRows: any[] = XLSX.utils.sheet_to_json(userSheet, { defval: '' });
      if (userRows && userRows.length > 0) {
        parsedUsers = userRows.map((row, idx) => {
          const username = String(row['نام کاربری'] || row['username'] || `user_${idx + 1}`).trim();
          const roleRaw = String(row['نقش'] || row['role'] || 'student').trim().toLowerCase();
          let role: 'student' | 'professor' | 'admin' = 'student';
          if (roleRaw.includes('استاد') || roleRaw.includes('prof') || roleRaw.includes('teacher')) role = 'professor';
          else if (roleRaw.includes('مدیر') || roleRaw.includes('ادمین') || roleRaw.includes('admin')) role = 'admin';

          return {
            id: `usr_${idx + 1}`,
            username,
            password: String(row['کلمه عبور'] || row['رمز عبور'] || row['password'] || '123456').trim(),
            role,
            fullName: String(row['نام و نام خانوادگی'] || row['نام'] || row['fullName'] || username).trim(),
            code: String(row['شماره دانشجویی / کد استادی'] || row['کد شناسایی'] || row['کد'] || row['code'] || '').trim(),
            department: String(row['گروه آموزشی / رشته'] || row['گروه آموزشی'] || row['رشته'] || row['دانشکده'] || row['department'] || '').trim(),
            academicRank: String(row['رتبه علمی'] || row['مرتبه علمی'] || row['academicRank'] || '').trim(),
            phone: String(row['شماره تماس'] || row['تلفن'] || row['phone'] || '').trim(),
            email: String(row['ایمیل'] || row['email'] || '').trim(),
            isActive: String(row['وضعیت'] || 'فعال').trim() !== 'غیرفعال',
            createdAt: String(row['تاریخ ایجاد'] || '1405/06/01').trim(),
          };
        });
      }
    } catch (err) {
      console.warn('Could not parse users sheet from workbook:', err);
    }
  }

  // Convert worksheet to array of arrays
  const rawRows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    return { columns: [], records: [], excludedColumnNames: [] };
  }

  // First row is the header
  const rawHeaderRow = rawRows[0] as (string | number | undefined)[];
  const dataRows = rawRows.slice(1);

  // Detect if separate day, month, year columns exist
  let dayColIndex = -1;
  let monthColIndex = -1;
  let yearColIndex = -1;
  let approvalColIndex = -1;

  rawHeaderRow.forEach((colName, index) => {
    if (!colName) return;
    const headerStr = String(colName).trim();
    if (dayColIndex === -1 && isDayColumn(headerStr)) {
      dayColIndex = index;
    } else if (monthColIndex === -1 && isMonthColumn(headerStr)) {
      monthColIndex = index;
    } else if (yearColIndex === -1 && isYearColumn(headerStr)) {
      yearColIndex = index;
    } else if (approvalColIndex === -1 && isApprovalColumn(headerStr)) {
      approvalColIndex = index;
    }
  });

  const shouldCombineDate = dayColIndex !== -1 && (monthColIndex !== -1 || yearColIndex !== -1);

  const columns: ColumnDefinition[] = [];
  const excludedColumnNames: string[] = [];
  let combinedDateColInserted = false;

  // Insert Approval Status Column first for high visibility
  columns.push({
    id: 'col_approval_status',
    originalKey: 'وضعیت تایید نمایش',
    label: 'وضعیت تایید نمایش',
    isExcluded: false,
    uniqueValues: ['تایید شده (قابل نمایش)', 'در انتظار تایید ادمین', 'عدم نمایش (رد شده)'],
    type: 'category',
  });

  rawHeaderRow.forEach((colName, index) => {
    const originalKey = colName ? String(colName).trim() : `ستون_${index + 1}`;
    if (!originalKey) return;

    // Skip raw approval col from repeating since we have dedicated col_approval_status
    if (index === approvalColIndex) {
      return;
    }

    // If this is one of the day/month/year columns and we are combining them:
    if (shouldCombineDate && (index === dayColIndex || index === monthColIndex || index === yearColIndex)) {
      if (!combinedDateColInserted) {
        // Collect combined date values across all data rows for unique values & filtering
        const uniqueSet = new Set<string>();
        dataRows.forEach(row => {
          const dVal = dayColIndex !== -1 ? row[dayColIndex] : '';
          const mVal = monthColIndex !== -1 ? row[monthColIndex] : '';
          const yVal = yearColIndex !== -1 ? row[yearColIndex] : '';
          const formatted = formatCombinedPersianDate(dVal, mVal, yVal);
          if (formatted) uniqueSet.add(formatted);
        });

        columns.push({
          id: 'col_combined_date',
          originalKey: 'تاریخ دفاع',
          label: 'تاریخ دفاع',
          isExcluded: false,
          uniqueValues: Array.from(uniqueSet).sort((a, b) => a.localeCompare(b, 'fa')),
          type: 'date',
        });
        combinedDateColInserted = true;
      }
      // Skip adding individual day, month, year to visible columns list
      return;
    }

    // Collect sample values for this column to detect drive links / pdfs / timestamp
    const isProf = isProfessorColumn(originalKey);
    const sampleValues = dataRows.map(row => {
      const val = row[index];
      let stringVal = val !== undefined && val !== null ? String(val).trim() : '';
      if (isProf && stringVal) {
        stringVal = ensureDoctorPrefix(stringVal);
      }
      return stringVal;
    });

    const isExcluded = isExcludedColumn(originalKey, sampleValues);

    if (isExcluded) {
      excludedColumnNames.push(originalKey);
    } else {
      // Find unique non-empty values for filtering
      const uniqueSet = new Set<string>();
      sampleValues.forEach(val => {
        if (val) uniqueSet.add(val);
      });

      columns.push({
        id: `col_${index}`,
        originalKey,
        label: cleanHeaderLabel(originalKey),
        isExcluded: false,
        uniqueValues: Array.from(uniqueSet).sort((a, b) => a.localeCompare(b, 'fa')),
      });
    }
  });

  // Map each data row to a DefenseRecord
  const records: DefenseRecord[] = dataRows
    .filter(row => row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map((row, rowIndex) => {
      // Check if approval status exists in row, or use defaults
      let status: ApprovalStatus = defaultStatusForNew;
      if (approvalColIndex !== -1) {
        status = normalizeApprovalStatus(String(row[approvalColIndex]));
      }

      const record: DefenseRecord = {
        id: `rec_${rowIndex + 1}`,
        approvalStatus: status,
        'col_approval_status': formatApprovalStatusPersian(status),
        'وضعیت تایید نمایش': formatApprovalStatusPersian(status),
        'وضعیت تایید': formatApprovalStatusPersian(status),
      };

      rawHeaderRow.forEach((colName, colIdx) => {
        const originalKey = colName ? String(colName).trim() : `ستون_${colIdx + 1}`;
        const val = row[colIdx];
        let stringVal = val !== undefined && val !== null ? String(val).trim() : '';
        
        // Auto-insert 'دکتر' if missing on professor / academic referee fields
        if (stringVal && isProfessorColumn(originalKey)) {
          stringVal = ensureDoctorPrefix(stringVal);
        }

        // Store both with column id and original key
        record[`col_${colIdx}`] = stringVal;
        record[originalKey] = stringVal;
      });

      // If date columns are combined, add combined date property
      if (shouldCombineDate) {
        const dVal = dayColIndex !== -1 ? row[dayColIndex] : '';
        const mVal = monthColIndex !== -1 ? row[monthColIndex] : '';
        const yVal = yearColIndex !== -1 ? row[yearColIndex] : '';
        const formattedDate = formatCombinedPersianDate(dVal, mVal, yVal);

        record['col_combined_date'] = formattedDate;
        record['تاریخ دفاع'] = formattedDate;
        record['تاریخ'] = formattedDate;
      }

      return record;
    });

  // Sort records chronologically by defense date & time by default
  const sortedRecords = sortRecordsByDefenseDate(records, columns, true);

  return {
    columns,
    records: sortedRecords,
    excludedColumnNames,
    users: parsedUsers,
  };
}

/**
 * Prettifies Persian header labels if needed
 */
function cleanHeaderLabel(original: string): string {
  let label = original.trim();
  // Remove unnecessary leading commas or spaces
  label = label.replace(/^[\s,]+|[\s,]+$/g, '');
  return label;
}

/**
 * Exports current records and users to an Excel file with doctor prefixes intact
 * Includes 'جلسات دفاع' sheet and 'کاربران و اساتید' sheet.
 */
export function exportToExcel(
  records: DefenseRecord[],
  columns: ColumnDefinition[],
  fileName: string = 'form_defa.xlsx',
  users?: AppUser[]
) {
  // 1. Sheet 1: Defense Sessions
  const exportData = records.map((record, index) => {
    const rowObj: Record<string, string | number> = {
      'ردیف': index + 1,
      'وضعیت تایید نمایش': formatApprovalStatusPersian(record.approvalStatus || 'approved'),
    };
    columns.forEach(col => {
      if (col.id === 'col_approval_status') return;
      let val = (record[col.id] as string) || (record[col.originalKey] as string) || '-';
      if (val && val !== '-' && (isProfessorColumn(col.label) || isProfessorColumn(col.originalKey))) {
        val = ensureDoctorPrefix(val);
      }
      rowObj[col.label] = val;
    });
    return rowObj;
  });

  const defenseWorksheet = XLSX.utils.json_to_sheet(exportData);
  // Set RTL on the defense worksheet
  if (!defenseWorksheet['!views']) {
    defenseWorksheet['!views'] = [];
  }
  defenseWorksheet['!views'].push({ rightToLeft: true });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, defenseWorksheet, 'جلسات دفاع');

  // 2. Sheet 2: Users & Professors (شیت کاربران فایل اکسل form_defa)
  const usersToExport = users && users.length > 0 ? users : getStoredUsers();
  if (usersToExport && usersToExport.length > 0) {
    const usersData = usersToExport.map((user, index) => ({
      'ردیف': index + 1,
      'نام کاربری': user.username,
      'کلمه عبور': user.password || '123456',
      'نقش': user.role === 'admin' ? 'مدیر سیستم' : user.role === 'professor' ? 'استاد' : 'دانشجو',
      'نام و نام خانوادگی': user.fullName,
      'شماره دانشجویی / کد استادی': user.code || '—',
      'گروه آموزشی / رشته': user.department || '—',
      'رتبه علمی': user.academicRank || '—',
      'شماره تماس': user.phone || '—',
      'وضعیت': user.isActive ? 'فعال' : 'غیرفعال',
      'تاریخ ایجاد': user.createdAt || '1405/06/01',
    }));

    const usersWorksheet = XLSX.utils.json_to_sheet(usersData);
    if (!usersWorksheet['!views']) {
      usersWorksheet['!views'] = [];
    }
    usersWorksheet['!views'].push({ rightToLeft: true });
    XLSX.utils.book_append_sheet(workbook, usersWorksheet, 'کاربران و اساتید');
  }

  XLSX.writeFile(workbook, fileName);
}
