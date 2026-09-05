/**
 * Google Drive / Google Sheets link helpers
 */

export interface GoogleDriveParseResult {
  type: 'sheets' | 'drive_file' | 'direct_url' | 'unknown';
  fetchUrl?: string;
  fileId?: string;
  name?: string;
}

/**
 * Extracts sheet ID or file ID from common Google Drive / Google Sheets URLs,
 * or detects a raw Google Drive File ID.
 */
export function parseGoogleDriveUrl(url: string): GoogleDriveParseResult {
  if (!url) {
    return { type: 'unknown' };
  }

  const trimmed = url.trim();

  // Pattern 1: Google Sheets URL (e.g. docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...)
  const sheetsMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetsMatch && sheetsMatch[1]) {
    const sheetId = sheetsMatch[1];
    return {
      type: 'sheets',
      fileId: sheetId,
      fetchUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
    };
  }

  // Pattern 2: Google Drive File URL (e.g. drive.google.com/file/d/FILE_ID/view or drive.google.com/open?id=FILE_ID)
  const driveFileMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return {
      type: 'drive_file',
      fileId,
      fetchUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // Pattern 3: Raw Google Drive / Sheets File ID (alphanumeric, dashes, underscores, length >= 20 without slashes or spaces)
  if (/^[a-zA-Z0-9_-]{20,80}$/.test(trimmed)) {
    return {
      type: 'drive_file',
      fileId: trimmed,
      fetchUrl: `https://drive.google.com/uc?export=download&id=${trimmed}`,
    };
  }

  // Pattern 4: Direct URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'direct_url',
      fetchUrl: trimmed,
    };
  }

  return {
    type: 'unknown',
  };
}

/**
 * Fetches file content from a URL via proxy or direct fetch
 */
export async function fetchFileFromUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`خطا در دریافت فایل (${response.status}): ${response.statusText}`);
  }
  return await response.arrayBuffer();
}
