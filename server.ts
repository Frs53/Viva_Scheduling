import express from 'express';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';
import { 
  ensureInitialExcelFile, 
  saveLocalExcelFile, 
  saveUploadedExcelBuffer,
  getLocalExcelBuffer,
  EXCEL_FILE_PATH 
} from './server/localDataService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize local form_defa.xlsx if not present
  ensureInitialExcelFile();

  // JSON Body Parser for record saving
  app.use(express.json({ limit: '20mb' }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Permanent Link / Direct Download of the local Excel file
  // Accessible at: /form_defa.xlsx and /api/files/form_defa.xlsx
  const handleDownloadExcel = (req: express.Request, res: express.Response) => {
    try {
      ensureInitialExcelFile();
      if (!fs.existsSync(EXCEL_FILE_PATH)) {
        return res.status(404).json({ error: 'فایل اکسل محلی یافت نشد.' });
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="form_defa.xlsx"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      const fileStream = fs.createReadStream(EXCEL_FILE_PATH);
      fileStream.pipe(res);
    } catch (err: any) {
      console.error('Error downloading local form_defa.xlsx:', err);
      res.status(500).json({ error: err.message || 'خطا در دانلود فایل اکسل' });
    }
  };

  app.get('/form_defa.xlsx', handleDownloadExcel);
  app.get('/api/files/form_defa.xlsx', handleDownloadExcel);

  // API Route: Get Defense Records & Users parsed directly from local form_defa.xlsx
  app.get('/api/defense-data', (req, res) => {
    try {
      const { buffer, lastModified } = getLocalExcelBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Parse Sheet 1: Defense sessions
      const firstSheetName = workbook.SheetNames[0] || 'جلسات دفاع';
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      // Parse Sheet 2 (if present): Users & Professors
      let users: any[] = [];
      const userSheetName = workbook.SheetNames.find(n => n.includes('کاربر') || n.includes('اساتید'));
      if (userSheetName) {
        const userSheet = workbook.Sheets[userSheetName];
        const userRows: any[] = XLSX.utils.sheet_to_json(userSheet, { defval: '' });
        users = userRows.map((row, idx) => ({
          id: `usr_${idx + 1}`,
          username: String(row['نام کاربری'] || `user_${idx + 1}`).trim(),
          password: String(row['کلمه عبور'] || '123456').trim(),
          role: String(row['نقش'] || '').includes('مدیر')
            ? 'admin'
            : String(row['نقش'] || '').includes('استاد')
            ? 'professor'
            : 'student',
          fullName: String(row['نام و نام خانوادگی'] || row['نام'] || '').trim(),
          code: String(row['شماره دانشجویی / کد استادی'] || row['کد شناسایی'] || '').trim(),
          department: String(row['گروه آموزشی / رشته'] || row['رشته'] || '').trim(),
          academicRank: String(row['رتبه علمی'] || row['مرتبه علمی'] || '').trim(),
          phone: String(row['شماره تماس'] || row['تلفن'] || '').trim(),
          isActive: String(row['وضعیت'] || 'فعال').trim() !== 'غیرفعال',
          createdAt: String(row['تاریخ ایجاد'] || '1405/06/01').trim(),
        }));
      }

      res.json({
        success: true,
        sourceName: 'form_defa.xlsx',
        rawRows,
        users,
        lastModified,
        permanentUrl: '/form_defa.xlsx',
      });
    } catch (err: any) {
      console.error('Error reading local defense data:', err);
      res.status(500).json({ error: err.message || 'خطا در بارگذاری داده‌های محلی' });
    }
  });

  // API Route: Save Defense Records & Users to local form_defa.xlsx
  app.post('/api/defense-data', (req, res) => {
    try {
      const { records, columns, users } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'داده‌های ارسالی نامعتبر است.' });
      }

      const result = saveLocalExcelFile(records, columns || [], users);
      console.log(`Saved ${records.length} records to local form_defa.xlsx`);

      res.json({
        success: true,
        message: 'فایل محلی form_defa.xlsx با موفقیت به‌روزرسانی شد.',
        count: result.recordCount,
        lastModified: result.lastModified,
        permanentUrl: '/form_defa.xlsx',
      });
    } catch (err: any) {
      console.error('Error saving to local form_defa.xlsx:', err);
      res.status(500).json({ error: err.message || 'خطا در ذخیره‌سازی فایل محلی' });
    }
  });

  // API Route: Upload new Excel file and overwrite local form_defa.xlsx
  app.post('/api/upload-excel', (req, res) => {
    try {
      const { fileBase64, fileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: 'محتوای فایل ارسال نشده است.' });
      }

      const buffer = Buffer.from(fileBase64, 'base64');
      const result = saveUploadedExcelBuffer(buffer, fileName);
      console.log(`Uploaded Excel file '${fileName || 'form_defa.xlsx'}' successfully saved (${result.size} bytes)`);

      res.json({
        success: true,
        message: 'فایل اکسل با موفقیت بارگذاری شد و در فایل محلی سامانه ذخیره گردید.',
        sheetNames: result.sheetNames,
        size: result.size,
        lastModified: result.lastModified,
        permanentUrl: '/form_defa.xlsx',
      });
    } catch (err: any) {
      console.error('Error uploading Excel file:', err);
      res.status(500).json({ error: err.message || 'خطا در بارگذاری و پردازش فایل اکسل' });
    }
  });

  // Vite middleware for development vs static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Permanent local Excel file accessible at: http://0.0.0.0:${PORT}/form_defa.xlsx`);
  });
}

startServer();
