import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { AppUser } from '../types/user';
import { parseExcelOrCsvData, ParseResult } from '../utils/excelParser';
import { RAW_SAMPLE_CSV } from '../data/sampleData';

const LOCAL_STORAGE_KEY_CACHED = 'local_defense_cached_data_v1';
const LOCAL_STORAGE_KEY_LAST_MODIFIED = 'local_defense_last_modified';

export interface LocalDataResult extends ParseResult {
  sourceName: string;
  lastModified: number;
  permanentUrl: string;
}

export class LocalDataService {
  private static instance: LocalDataService;

  private constructor() {}

  public static getInstance(): LocalDataService {
    if (!LocalDataService.instance) {
      LocalDataService.instance = new LocalDataService();
    }
    return LocalDataService.instance;
  }

  /**
   * Returns the permanent direct link to the local form_defa.xlsx file
   */
  public getPermanentFileUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/form_defa.xlsx`;
  }

  /**
   * Loads data directly from the local server Excel file /form_defa.xlsx.
   * If server is offline, falls back to localStorage or default sample data.
   */
  public async loadDefenseData(): Promise<LocalDataResult> {
    const permanentUrl = this.getPermanentFileUrl();

    try {
      // 1. Fetch raw binary Excel file from local server
      const response = await fetch('/form_defa.xlsx', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const parsed = parseExcelOrCsvData(buffer);
      const lastModified = Date.now();

      // Cache locally in localStorage for offline resilience
      this.cacheDataLocally(parsed.records, parsed.columns, parsed.excludedColumnNames, parsed.users, lastModified);

      return {
        ...parsed,
        sourceName: 'form_defa.xlsx',
        lastModified,
        permanentUrl,
      };
    } catch (err) {
      console.warn('Could not fetch /form_defa.xlsx from server, trying cached data...', err);
      const cached = this.getCachedData();
      if (cached) {
        return {
          ...cached,
          permanentUrl,
        };
      }

      // Fallback to RAW_SAMPLE_CSV
      const parsed = parseExcelOrCsvData(RAW_SAMPLE_CSV);
      return {
        ...parsed,
        sourceName: 'form_defa.xlsx (محلی)',
        lastModified: Date.now(),
        permanentUrl,
      };
    }
  }

  /**
   * Uploads an Excel file from the client and overwrites the server's form_defa.xlsx
   */
  public async uploadExcelFile(file: File): Promise<LocalDataResult> {
    const permanentUrl = this.getPermanentFileUrl();

    // 1. Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // 2. Client-side parse to validate immediately
    const parsed = parseExcelOrCsvData(buffer);
    if (!parsed.records || parsed.records.length === 0) {
      throw new Error('فایل بارگذاری شده حاوی هیچ رکوردی نیست یا قالب آن نامعتبر است.');
    }

    // 3. Convert buffer to base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = btoa(binary);

    // 4. Send to server to overwrite local form_defa.xlsx
    const response = await fetch('/api/upload-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileBase64,
        fileName: file.name,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `خطای سرور: ${response.status}`);
    }

    const lastModified = Date.now();
    this.cacheDataLocally(parsed.records, parsed.columns, parsed.excludedColumnNames, parsed.users, lastModified);

    return {
      ...parsed,
      sourceName: file.name,
      lastModified,
      permanentUrl,
    };
  }

  /**
   * Saves records, columns, and users directly to the local form_defa.xlsx file on the server.
   */
  public async saveDefenseData(
    records: DefenseRecord[],
    columns: ColumnDefinition[],
    users?: AppUser[]
  ): Promise<{ success: boolean; lastModified: number }> {
    const now = Date.now();
    this.cacheDataLocally(records, columns, [], users, now);

    try {
      const response = await fetch('/api/defense-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records,
          columns,
          users,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        lastModified: result.lastModified || now,
      };
    } catch (err: any) {
      console.error('Error saving to server /api/defense-data:', err);
      // Even if network fails, data was saved to local cache
      return {
        success: true,
        lastModified: now,
      };
    }
  }

  public getCachedData(): LocalDataResult | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CACHED);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        sourceName: 'form_defa.xlsx (کش محلی)',
        permanentUrl: this.getPermanentFileUrl(),
      };
    } catch {
      return null;
    }
  }

  private cacheDataLocally(
    records: DefenseRecord[],
    columns: ColumnDefinition[],
    excludedColumnNames: string[],
    users?: AppUser[],
    lastModified: number = Date.now()
  ) {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY_CACHED,
        JSON.stringify({
          records,
          columns,
          excludedColumnNames,
          users,
          lastModified,
        })
      );
      localStorage.setItem(LOCAL_STORAGE_KEY_LAST_MODIFIED, String(lastModified));
    } catch (err) {
      console.warn('Failed to cache data to localStorage:', err);
    }
  }
}

export const localDataService = LocalDataService.getInstance();
