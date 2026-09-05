export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface DefenseRecord {
  id: string;
  approvalStatus?: ApprovalStatus;
  [key: string]: string | number | undefined | ApprovalStatus;
}

export interface ColumnDefinition {
  id: string;
  originalKey: string;
  label: string;
  isExcluded: boolean;
  uniqueValues?: string[];
  type?: 'text' | 'date' | 'time' | 'category' | 'number';
}

export interface FilterValues {
  [columnId: string]: {
    text: string;
    selectedOptions: string[];
  };
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DefenseStats {
  total: number;
  filtered: number;
  mastersCount: number;
  phdCount: number;
  upcomingDatesCount: number;
  departmentsCount: number;
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
}

/**
 * Checks if a column name or its contents represents timestamp or PDF / file upload columns
 * which must be strictly hidden from display.
 */
export function isExcludedColumn(columnName: string, sampleValues: string[] = []): boolean {
  const normalized = columnName.trim().toLowerCase();

  // 1. Check for Timestamp variations
  const timestampPatterns = [
    'timestamp',
    'time stamp',
    'time_stamp',
    'تاریخ ثبت',
    'زمان ثبت',
    'مهر زمان',
    'برچسب زمان',
    'زمان ارسال',
  ];
  if (timestampPatterns.some(pattern => normalized.includes(pattern))) {
    return true;
  }

  // 2. Check for PDF, Thesis File Upload, Drive File URLs
  const fileUploadPatterns = [
    'آپلود فایل',
    'فایل پایان نامه',
    'فایل رساله',
    'فایل پروپزال',
    'فایل گزارش',
    'پیوست',
    'pdf',
    'پی دی اف',
    'بارگذاری فایل',
    'لینک فایل',
    'آدرس فایل',
    'upload file',
    'file upload',
    'thesis file',
    'attachment',
  ];
  if (fileUploadPatterns.some(pattern => normalized.includes(pattern))) {
    return true;
  }

  // 3. Inspect sample values: if all non-empty values are Google Drive file links or ending in .pdf
  if (sampleValues.length > 0) {
    const nonEmpty = sampleValues.filter(v => typeof v === 'string' && v.trim() !== '');
    if (nonEmpty.length > 0) {
      const isDriveFileColumn = nonEmpty.every(v => 
        v.includes('drive.google.com/open?id=') || 
        v.includes('drive.google.com/file/d/') ||
        v.toLowerCase().endsWith('.pdf')
      );
      if (isDriveFileColumn) {
        return true;
      }
    }
  }

  return false;
}
