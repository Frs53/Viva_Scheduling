import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { AppUser } from '../types/user';
import { parseExcelOrCsvData } from '../utils/excelParser';
import { ensureDoctorPrefix, isProfessorColumn, sortRecordsByDefenseDate } from '../utils/persianUtils';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
              scope?: string;
            }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export interface CachedDefenseData {
  columns: ColumnDefinition[];
  records: DefenseRecord[];
  excludedColumnNames: string[];
  sourceName: string;
  cachedAt: number;
  users?: AppUser[];
}

export interface PermanentAccessConfig {
  fileId: string | null;
  url: string | null;
  fileName: string;
  isConfigured: boolean;
  mode: 'permanent_link' | 'oauth_silent';
}

const STORAGE_KEY_ACCESS_TOKEN = 'gdrive_access_token';
const STORAGE_KEY_EXPIRY = 'gdrive_token_expiry';
const STORAGE_KEY_ACTIVE_FILE_ID = 'gdrive_active_file_id';
const STORAGE_KEY_ACTIVE_FILE_NAME = 'gdrive_active_file_name';
const STORAGE_KEY_PERMANENT_FILE_ID = 'defense_permanent_file_id';
const STORAGE_KEY_PERMANENT_URL = 'defense_permanent_url';
const STORAGE_KEY_PERMANENT_NAME = 'defense_permanent_name';
const STORAGE_KEY_CACHED_DATA = 'defense_form_defa_cached_data_v2';

export const TARGET_FILE_NAME = 'form_defa.xlsx';
export const TARGET_FORM_NAME = 'form_defa.xlsx';

// Google OAuth Client ID provisioned for this project
const DEFAULT_OAUTH_CLIENT_ID =
  '261931483452-a2gm6agb48v9thc2ot04psuaco727ik4.apps.googleusercontent.com';

export class GoogleWorkspaceService {
  private static instance: GoogleWorkspaceService;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private tokenClient: any = null;
  private isRenewingToken: boolean = false;

  private constructor() {
    this.loadPersistedToken();
  }

  public static getInstance(): GoogleWorkspaceService {
    if (!GoogleWorkspaceService.instance) {
      GoogleWorkspaceService.instance = new GoogleWorkspaceService();
    }
    return GoogleWorkspaceService.instance;
  }

  private loadPersistedToken() {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      const savedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
      if (savedToken && savedExpiry) {
        const expiry = parseInt(savedExpiry, 10);
        // Retain token if not expired
        if (expiry > Date.now()) {
          this.accessToken = savedToken;
          this.tokenExpiry = expiry;
        } else {
          // If expired, keep reference for renewal attempt but mark expired
          this.accessToken = null;
          this.tokenExpiry = 0;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getAccessToken(): string | null {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    return null;
  }

  public isConnected(): boolean {
    return !!this.getAccessToken() || this.getPermanentAccess().isConfigured;
  }

  public clearToken() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    try {
      localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEY_EXPIRY);
    } catch {}
  }

  // ==========================================
  // Permanent Access Storage & Methods
  // ==========================================

  public setPermanentAccess(fileId: string, url?: string, fileName?: string) {
    try {
      localStorage.setItem(STORAGE_KEY_PERMANENT_FILE_ID, fileId);
      if (url) localStorage.setItem(STORAGE_KEY_PERMANENT_URL, url);
      const finalName = fileName || TARGET_FILE_NAME;
      localStorage.setItem(STORAGE_KEY_PERMANENT_NAME, finalName);
      // Also set as active
      this.saveActiveFile(fileId, finalName);
    } catch {}
  }

  public getPermanentAccess(): PermanentAccessConfig {
    try {
      const fileId = localStorage.getItem(STORAGE_KEY_PERMANENT_FILE_ID);
      const url = localStorage.getItem(STORAGE_KEY_PERMANENT_URL);
      const fileName = localStorage.getItem(STORAGE_KEY_PERMANENT_NAME) || TARGET_FILE_NAME;
      return {
        fileId,
        url,
        fileName,
        isConfigured: !!fileId,
        mode: url ? 'permanent_link' : 'oauth_silent',
      };
    } catch {
      return {
        fileId: null,
        url: null,
        fileName: TARGET_FILE_NAME,
        isConfigured: false,
        mode: 'oauth_silent',
      };
    }
  }

  public clearPermanentAccess() {
    try {
      localStorage.removeItem(STORAGE_KEY_PERMANENT_FILE_ID);
      localStorage.removeItem(STORAGE_KEY_PERMANENT_URL);
      localStorage.removeItem(STORAGE_KEY_PERMANENT_NAME);
    } catch {}
  }

  public saveActiveFile(fileId: string, fileName: string) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_FILE_ID, fileId);
      localStorage.setItem(STORAGE_KEY_ACTIVE_FILE_NAME, fileName);
    } catch {}
  }

  public getActiveFile(): { fileId: string | null; fileName: string | null } {
    try {
      // Check permanent file first
      const permFileId = localStorage.getItem(STORAGE_KEY_PERMANENT_FILE_ID);
      const permFileName = localStorage.getItem(STORAGE_KEY_PERMANENT_NAME);
      if (permFileId) {
        return { fileId: permFileId, fileName: permFileName || TARGET_FILE_NAME };
      }

      return {
        fileId: localStorage.getItem(STORAGE_KEY_ACTIVE_FILE_ID),
        fileName: localStorage.getItem(STORAGE_KEY_ACTIVE_FILE_NAME),
      };
    } catch {
      return { fileId: null, fileName: null };
    }
  }

  // ==========================================
  // Local Persistent Cache (Offline-ready)
  // ==========================================

  public saveCachedData(data: {
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
  }) {
    try {
      const payload: CachedDefenseData = {
        ...data,
        cachedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_CACHED_DATA, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to cache defense data to localStorage:', e);
    }
  }

  public getCachedData(): CachedDefenseData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CACHED_DATA);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedDefenseData;
      if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // Silent & Interactive Google OAuth Flow
  // ==========================================

  /**
   * Ensures an active, unexpired Google access token.
   * If token is missing or near expiry (< 3 min), attempts silent background renewal.
   */
  public async ensureFreshToken(): Promise<string | null> {
    const now = Date.now();
    // If token is valid for more than 2 minutes, return it
    if (this.accessToken && this.tokenExpiry - now > 120000) {
      return this.accessToken;
    }

    // Attempt silent background renewal
    if (this.isRenewingToken) {
      // Wait briefly if another refresh is already running
      await new Promise((r) => setTimeout(r, 500));
      return this.accessToken;
    }

    try {
      this.isRenewingToken = true;
      const token = await this.requestOAuthToken({ silent: true });
      return token;
    } catch (err) {
      // Silent refresh might fail if user has not yet signed in or cookie blocked
      return this.accessToken && this.tokenExpiry > now ? this.accessToken : null;
    } finally {
      this.isRenewingToken = false;
    }
  }

  /**
   * Request Google OAuth Access Token via Google Identity Services
   * Supports silent renewal (prompt: '') and interactive consent.
   */
  public async requestOAuthToken(options?: {
    clientId?: string;
    silent?: boolean;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(
          new Error(
            'کتابخانه Google Identity Services هنوز بارگذاری نشده است. لطفاً چند لحظه بعد دوباره امتحان کنید.'
          )
        );
        return;
      }

      const activeClientId =
        options?.clientId ||
        ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) ||
        DEFAULT_OAUTH_CLIENT_ID;

      const isSilent = !!options?.silent;

      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope:
            'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/forms.responses.readonly',
          callback: (response) => {
            if (response.error) {
              if (isSilent) {
                reject(new Error(`Silent renewal failed: ${response.error}`));
              } else {
                reject(new Error(`خطای احراز هویت گوگل: ${response.error}`));
              }
              return;
            }

            if (response.access_token) {
              const expiresIn = (response.expires_in || 3600) * 1000;
              this.accessToken = response.access_token;
              this.tokenExpiry = Date.now() + expiresIn;

              try {
                localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, this.accessToken);
                localStorage.setItem(STORAGE_KEY_EXPIRY, String(this.tokenExpiry));
              } catch {}

              resolve(response.access_token);
            } else {
              reject(new Error('توکن دسترسی از گوگل دریافت نشد.'));
            }
          },
        });

        // Request token (prompt: '' performs silent background renewal if authorized)
        this.tokenClient.requestAccessToken({ prompt: isSilent ? '' : undefined });
      } catch (err: any) {
        reject(new Error(`خطا در اجرای احراز هویت گوگل: ${err.message || err}`));
      }
    });
  }

  // ==========================================
  // Google Drive File Operations
  // ==========================================

  /**
   * Search Google Drive for files matching form_defa.xlsx or defense form/sheets
   */
  public async searchDefenseFiles(queryText?: string): Promise<DriveFileItem[]> {
    const token = await this.ensureFreshToken();
    if (!token) {
      throw new Error('لطفاً ابتدا به حساب گوگل خود متصل شوید.');
    }

    const searchQuery = queryText || TARGET_FILE_NAME;

    // Construct Drive API query
    const qParts = [
      'trashed = false',
      `(name contains 'form_defa' or name contains '${searchQuery.replace(
        /'/g,
        "\\'"
      )}' or name contains 'defa' or name contains '1405' or name contains 'دفاع' or name contains 'اطلاع رسانی')`,
    ];
    const q = qParts.join(' and ');

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&pageSize=25&orderBy=modifiedTime desc`;

    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      // Try silent renewal once on 401
      const freshToken = await this.requestOAuthToken({ silent: true }).catch(() => null);
      if (freshToken) {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${freshToken}` },
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('اعتبار دسترسی گوگل منقضی شده است. لطفاً دکمه اتصال مجدد را بزنید.');
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        `خطای درایو گوگل (${response.status}): ${errJson?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Fetch any file (Excel .xlsx, Google Sheets, Google Forms, CSV) with permanent fallback
   */
  public async fetchDriveFile(
    fileId: string,
    fileName?: string,
    mimeType?: string
  ): Promise<{
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
    users?: AppUser[];
  }> {
    const activeFileName = fileName || TARGET_FILE_NAME;
    let token = await this.ensureFreshToken();

    // 1. If mimeType indicates Google Forms
    if (mimeType?.includes('form')) {
      return this.fetchFormResponses(fileId);
    }

    // 2. Binary Excel file (.xlsx) or Drive file via Google Drive API alt=media
    if (token) {
      try {
        const mediaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        let mediaRes = await fetch(mediaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (mediaRes.status === 401) {
          const freshToken = await this.requestOAuthToken({ silent: true }).catch(() => null);
          if (freshToken) {
            token = freshToken;
            mediaRes = await fetch(mediaUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }

        if (mediaRes.ok) {
          const arrayBuffer = await mediaRes.arrayBuffer();
          if (arrayBuffer.byteLength > 0) {
            const parsed = parseExcelOrCsvData(arrayBuffer);
            if (parsed.records.length > 0) {
              const result = { ...parsed, sourceName: activeFileName };
              this.saveCachedData(result);
              return result;
            }
          }
        }
      } catch (err) {
        console.warn('Drive alt=media fetch failed, trying Sheets/Export alternatives...', err);
      }
    }

    // 3. Try Google Sheets API / CSV Export
    try {
      const sheetsData = await this.fetchSpreadsheetData(fileId, activeFileName);
      if (sheetsData.records.length > 0) {
        this.saveCachedData(sheetsData);
        return sheetsData;
      }
    } catch (err) {
      console.warn('Sheets API fetch failed, trying direct public downloads...', err);
    }

    // 4. Permanent Public Download Endpoints (for files shared with "Anyone with the link")
    const publicDownloadUrls = [
      `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`,
      `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
      `https://drive.google.com/uc?export=download&id=${fileId}`,
    ];

    for (const pUrl of publicDownloadUrls) {
      try {
        const res = await fetch(pUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 100) {
            const parsed = parseExcelOrCsvData(buf);
            if (parsed.records.length > 0) {
              const result = { ...parsed, sourceName: activeFileName };
              this.saveCachedData(result);
              return result;
            }
          }
        }
      } catch (e) {
        // continue to next endpoint
      }
    }

    throw new Error(
      `امکان دریافت داده‌های فایل «${activeFileName}» وجود ندارد. لطفاً از فعال بودن دسترسی فایل در گوگل درایو مطمئن شوید.`
    );
  }

  /**
   * Fetch data from Google Sheets / Drive Export
   */
  public async fetchSpreadsheetData(
    fileId: string,
    customTitle?: string
  ): Promise<{
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
  }> {
    const token = await this.ensureFreshToken();
    const fallbackTitle = customTitle || TARGET_FILE_NAME;

    // Attempt 1: Fetch via Google Sheets API values
    if (token) {
      try {
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties.title,properties.title`;
        const metaRes = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const sheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';
          const title = metaData.properties?.title || fallbackTitle;

          const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(
            sheetName
          )}!A1:ZZ5000`;
          const valuesRes = await fetch(valuesUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (valuesRes.ok) {
            const valuesData = await valuesRes.json();
            const rows: any[][] = valuesData.values || [];
            if (rows.length > 0) {
              const result = this.process2DRows(rows, title);
              this.saveCachedData(result);
              return result;
            }
          }
        }
      } catch (e) {
        console.warn('Sheets API v4 values failed, falling back to Drive export...', e);
      }

      // Attempt 2: Drive Export as CSV with Auth
      try {
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
        const exportRes = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (exportRes.ok) {
          const csvText = await exportRes.text();
          const parsed = parseExcelOrCsvData(csvText);
          if (parsed.records.length > 0) {
            const result = { ...parsed, sourceName: fallbackTitle };
            this.saveCachedData(result);
            return result;
          }
        }
      } catch (e) {
        console.warn('Drive export with auth failed:', e);
      }
    }

    // Attempt 3: Public CSV export link (works if file is shared publicly)
    try {
      const publicUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
      const publicRes = await fetch(publicUrl);
      if (publicRes.ok) {
        const csvText = await publicRes.text();
        const parsed = parseExcelOrCsvData(csvText);
        if (parsed.records.length > 0) {
          const result = { ...parsed, sourceName: fallbackTitle };
          this.saveCachedData(result);
          return result;
        }
      }
    } catch (e) {
      console.warn('Public CSV export failed:', e);
    }

    throw new Error(
      `امکان دریافت داده‌های فایل «${fallbackTitle}» وجود ندارد. لطفاً مطمئن شوید دسترسی فایل در گوگل درایو برقرار است.`
    );
  }

  /**
   * Fetch responses from Google Forms by Form ID
   */
  public async fetchFormResponses(formId: string): Promise<{
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
  }> {
    const token = await this.ensureFreshToken();
    if (!token) {
      throw new Error('برای خواندن مستقیم فرم به اتصال به حساب گوگل نیاز است.');
    }

    const formUrl = `https://forms.googleapis.com/v1/forms/${formId}`;
    const formRes = await fetch(formUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!formRes.ok) {
      throw new Error(`خطا در دریافت مشخصات فرم: ${formRes.statusText}`);
    }

    const formData = await formRes.json();
    const formTitle = formData.info?.title || TARGET_FILE_NAME;
    const items = formData.items || [];

    const questionMap = new Map<string, string>();
    items.forEach((item: any) => {
      if (item.questionItem && item.questionItem.question) {
        const qId = item.questionItem.question.questionId;
        const qTitle = item.title || item.description || `سوال_${qId}`;
        questionMap.set(qId, qTitle);
      }
    });

    const respUrl = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
    const responsesRes = await fetch(respUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!responsesRes.ok) {
      throw new Error(`خطا در دریافت پاسخ‌های فرم: ${responsesRes.statusText}`);
    }

    const responsesData = await responsesRes.json();
    const responses = responsesData.responses || [];

    const headers = ['Timestamp', 'وضعیت تایید نمایش', ...Array.from(questionMap.values())];
    const qIds = Array.from(questionMap.keys());
    const rows: string[][] = [headers];

    responses.forEach((resp: any) => {
      const timestamp = resp.createTime || new Date().toISOString();
      const answers = resp.answers || {};

      const rowValues = [timestamp, 'تایید شده'];

      qIds.forEach((qId) => {
        const ansObj = answers[qId];
        if (ansObj && ansObj.textAnswers && ansObj.textAnswers.answers) {
          const vals = ansObj.textAnswers.answers.map((a: any) => a.value).join(', ');
          rowValues.push(vals);
        } else {
          rowValues.push('');
        }
      });

      rows.push(rowValues);
    });

    const result = this.process2DRows(rows, formTitle);
    this.saveCachedData(result);
    return result;
  }

  /**
   * Process 2D string rows into standardized DefenseRecord list
   */
  private process2DRows(
    rows: any[][],
    sourceTitle: string
  ): {
    columns: ColumnDefinition[];
    records: DefenseRecord[];
    excludedColumnNames: string[];
    sourceName: string;
  } {
    if (!rows || rows.length === 0) {
      return {
        columns: [],
        records: [],
        excludedColumnNames: [],
        sourceName: sourceTitle,
      };
    }

    const headerRow = rows[0].map((c: any) =>
      c !== undefined && c !== null ? String(c).trim() : ''
    );
    const dataRows = rows.slice(1);

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvLines = [
      headerRow.map(escapeCsv).join(','),
      ...dataRows.map((row) => {
        return headerRow
          .map((_, i) => {
            const raw = row[i];
            let str = raw !== undefined && raw !== null ? String(raw).trim() : '';
            const colHeader = headerRow[i];
            if (str && isProfessorColumn(colHeader)) {
              str = ensureDoctorPrefix(str);
            }
            return escapeCsv(str);
          })
          .join(',');
      }),
    ];

    const csvContent = csvLines.join('\n');
    const parsed = parseExcelOrCsvData(csvContent);

    return {
      ...parsed,
      records: sortRecordsByDefenseDate(parsed.records, parsed.columns, true),
      sourceName: sourceTitle || TARGET_FILE_NAME,
    };
  }
}

export const workspaceService = GoogleWorkspaceService.getInstance();
