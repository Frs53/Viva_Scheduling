import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export interface ServerDefenseRecord {
  id: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  [key: string]: any;
}

export interface ServerUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'student' | 'professor';
  fullName: string;
  code?: string;
  department?: string;
  academicRank?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
export const EXCEL_FILE_PATH = path.join(DATA_DIR, 'form_defa.xlsx');
export const PUBLIC_EXCEL_PATH = path.join(PUBLIC_DIR, 'form_defa.xlsx');

const RAW_DEFAULT_CSV = `Timestamp,وضعیت تایید نمایش,نام و نام خانوادگی دانشجو,گرایش  تحصیلی,مقطع تحصیلی,دفاع از,لطفا روز دفاع را انتخاب کنید,لطفا ماه دفاع را انتخاب کنید,لطفا سال دفاع را انتخاب کنید,ساعت,نام و نام خانوادگی استاد راهنما,نام و نام خانوادگی استاد راهنمای دوم - در صورت وجود, نام و نام خانوادگی استاد مشاوراول - در صورت وجود, نام و نام خانوادگی استاد مشاوردوم  - در صورت وجود,  نام و نام خانوادگی استاد داور داخلی, نام و نام خانوادگی استاد داور خارجی اول  (در صورت وجود), نام و نام خانوادگی استاد داور خارجی دوم (در صورت وجود), نام و نام خانوادگی استاد ناظر,آپلود فایل پایان نامه /گزارش/رساله/ پروپزال,شماره تماس دانشجو
26/08/2026 18:07:04,تایید شده,منیژه پرویزی,هوش مصنوعی,کارشناسی ارشد,پایان نامه,7,شهریور,1405,09:00:00,دکتر فرساد زمانی,,دکتر میترا میرزارضایی,,دکتر جواد اکبری,,,,https://drive.google.com/open?id=1-tEWo3dgj94vxMUVdpjbKJPuwtO144uk,09126758824
26/08/2026 19:38:13,تایید شده,زهرا فتح اللهی ,نرم افزار,کارشناسی ارشد,پایان نامه,15,شهریور,1405,12:00:00,دکتر علی رضایی,,سرکار خانم دکتر سحر آدابی,,سرکار خانم دکتر زمانی فر,,,,https://drive.google.com/open?id=19XCqq_RLcGxmgCCaDUo6YpWA48i-ktRu,09905724725
26/08/2026 19:39:06,تایید شده,محدثه اجانلی,فناوری اطلاعات - تجارت الکترونیکی,کارشناسی ارشد,پایان نامه,15,شهریور,1405,10:00:00,دکتر مهدی صادق زاده,,دکتر پویا درخشان برجوئی,,دکتر جواد محمدزاده,,,,https://drive.google.com/open?id=1RE3DZ7zgRHG2pWMizo4VthCtXiJC7lza,09363352548
26/08/2026 20:45:19,تایید شده,مصطفی کاردان,نرم افزار,دکتری,پروپزال,11,شهریور,1405,17:00:00,دکتر فرهاد راد,دکتر سید محسن هاشمی,,,دکتر مهدی صادق زاده,دکتر مهدی مزینانی,دکتر مریم رجب زاده,دکتر فقیه میرزائی,https://drive.google.com/open?id=1SLuOzB9CPvtCQydXOAzId6Ol4ExT-r3j,09194898658
26/08/2026 21:12:40,تایید شده,امیرحسین موسوی,هوش مصنوعی و رباتیک,دکتری,پیش دفاع,18,شهریور,1405,14:30:00,دکتر علی رضایی,دکتر حمید حسنی,دکتر علیرضا جلالی,,دکتر فرهاد راد,دکتر محمد کریمی,دکتر سارا ادیب,دکتر مهدی صادق زاده,https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345,09121112233
26/08/2026 21:30:15,تایید شده,نگار رحیمی,شبکه‌های کامپیوتری,کارشناسی ارشد,پایان نامه,21,شهریور,1405,11:00:00,دکتر پویا درخشان برجوئی,,,دکتر فرساد زمانی,دکتر جواد اکبری,,,09123334455,https://drive.google.com/open?id=1zYxWvUtSrQpOnMlKjIhGfEdCbA543210,09123334455
26/08/2026 22:05:50,تایید شده,کیانوش طاهری,معماری سیستم‌های کامپیوتری,کارشناسی ارشد,پایان نامه,24,شهریور,1405,16:00:00,دکتر جواد محمدزاده,,دکتر میترا میرزارضایی,,دکتر علی رضایی,,,,https://drive.google.com/open?id=1M9n8b7v6c5x4z3a2s1d0f9g8h7j6k5,09187654321
26/08/2026 22:40:11,در انتظار تایید,فاطمه صابری,فناوری اطلاعات - تجارت الکترونیکی,کارشناسی ارشد,پایان نامه,28,شهریور,1405,13:30:00,سرکار خانم دکتر سحر آدابی,,دکتر مهدی صادق زاده,,سرکار خانم دکتر زمانی فر,,,,https://drive.google.com/open?id=1Lk9J8H7G6F5D4S3A2Z1X0C9V8B7N6M,09351239876
26/08/2026 23:15:30,در انتظار تایید,پدرام حسینی,هوش مصنوعی,کارشناسی ارشد,پایان نامه,30,شهریور,1405,10:30:00,دکتر فرساد زمانی,,دکتر پویا درخشان برجوئی,,دکتر جواد اکبری,,,,https://drive.google.com/open?id=1Qa2Ws3Ed4Rf5Tg6Yh7Uj8Ik9Ol0PzX,09129998877`;

const DEFAULT_USERS: ServerUser[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    password: 'roshd123',
    role: 'admin',
    fullName: 'مدیر سامانه تحصیلات تکمیلی',
    code: 'ADMIN-01',
    department: 'تحصیلات تکمیلی',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_std_1',
    username: 'std401',
    password: '123456',
    role: 'student',
    fullName: 'منیژه پرویزی',
    code: '40120101',
    department: 'هوش مصنوعی',
    phone: '09126758824',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_std_2',
    username: 'std402',
    password: '123456',
    role: 'student',
    fullName: 'زهرا فتح اللهی',
    code: '40120102',
    department: 'مهندسی نرم‌افزار',
    phone: '09905724725',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_std_3',
    username: 'std403',
    password: '123456',
    role: 'student',
    fullName: 'امیرحسین موسوی',
    code: '40120103',
    department: 'هوش مصنوعی و رباتیک',
    phone: '09121112233',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_1',
    username: 'dr.zamani',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر فرساد زمانی',
    code: 'PROF-101',
    department: 'هوش مصنوعی',
    academicRank: 'دانشیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_2',
    username: 'dr.rezaei',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر علی رضایی',
    code: 'PROF-102',
    department: 'مهندسی نرم‌افزار',
    academicRank: 'استاد تمام',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_3',
    username: 'dr.sadeghzadeh',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر مهدی صادق زاده',
    code: 'PROF-103',
    department: 'فناوری اطلاعات',
    academicRank: 'استادیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_4',
    username: 'dr.adabi',
    password: '123456',
    role: 'professor',
    fullName: 'سرکار خانم دکتر سحر آدابی',
    code: 'PROF-104',
    department: 'مهندسی نرم‌افزار',
    academicRank: 'دانشیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
];

export function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
}

/**
 * Initializes form_defa.xlsx from default CSV & users if it doesn't exist.
 */
export function ensureInitialExcelFile() {
  ensureDirectories();

  if (fs.existsSync(EXCEL_FILE_PATH)) {
    // If exists in data, ensure public copy is up-to-date
    try {
      fs.copyFileSync(EXCEL_FILE_PATH, PUBLIC_EXCEL_PATH);
    } catch (e) {
      console.warn('Could not sync to public path:', e);
    }
    return;
  }

  console.log('Initializing local form_defa.xlsx from template...');
  // Parse CSV
  const csvWorkbook = XLSX.read(RAW_DEFAULT_CSV, { type: 'string' });
  const firstSheetName = csvWorkbook.SheetNames[0];
  const defenseWorksheet = csvWorkbook.Sheets[firstSheetName];

  // Set RTL
  if (!defenseWorksheet['!views']) {
    defenseWorksheet['!views'] = [];
  }
  defenseWorksheet['!views'].push({ rightToLeft: true });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, defenseWorksheet, 'جلسات دفاع');

  // Sheet 2: Users & Professors
  const usersData = DEFAULT_USERS.map((user, index) => ({
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

  XLSX.writeFile(workbook, EXCEL_FILE_PATH);
  try {
    fs.copyFileSync(EXCEL_FILE_PATH, PUBLIC_EXCEL_PATH);
  } catch (e) {
    console.warn('Could not sync to public path:', e);
  }
  console.log('Local form_defa.xlsx created successfully at:', EXCEL_FILE_PATH);
}

/**
 * Saves given records and users to the local form_defa.xlsx file.
 */
export function saveLocalExcelFile(records: any[], columns: any[], users?: any[]) {
  ensureDirectories();

  const exportData = records.map((record, index) => {
    const rowObj: Record<string, string | number> = {
      'ردیف': index + 1,
      'وضعیت تایید نمایش': record.approvalStatus === 'pending'
        ? 'در انتظار تایید'
        : record.approvalStatus === 'rejected'
        ? 'عدم نمایش (رد شده)'
        : 'تایید شده (قابل نمایش)',
    };

    columns.forEach((col: any) => {
      if (col.id === 'col_approval_status') return;
      let val = record[col.id] ?? record[col.originalKey] ?? '-';
      rowObj[col.label || col.originalKey] = val;
    });

    return rowObj;
  });

  const defenseWorksheet = XLSX.utils.json_to_sheet(exportData);
  if (!defenseWorksheet['!views']) {
    defenseWorksheet['!views'] = [];
  }
  defenseWorksheet['!views'].push({ rightToLeft: true });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, defenseWorksheet, 'جلسات دفاع');

  const usersToExport = users && users.length > 0 ? users : DEFAULT_USERS;
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

  XLSX.writeFile(workbook, EXCEL_FILE_PATH);
  try {
    fs.copyFileSync(EXCEL_FILE_PATH, PUBLIC_EXCEL_PATH);
  } catch (e) {
    console.warn('Could not sync to public path:', e);
  }

  return {
    success: true,
    filePath: EXCEL_FILE_PATH,
    recordCount: records.length,
    userCount: usersToExport.length,
    lastModified: Date.now(),
  };
}

/**
 * Reads form_defa.xlsx and returns raw buffer and stats
 */
export function getLocalExcelBuffer(): { buffer: Buffer; lastModified: number } {
  ensureInitialExcelFile();
  const stat = fs.statSync(EXCEL_FILE_PATH);
  const buffer = fs.readFileSync(EXCEL_FILE_PATH);
  return {
    buffer,
    lastModified: stat.mtimeMs,
  };
}

/**
 * Saves an uploaded Excel buffer directly to form_defa.xlsx
 */
export function saveUploadedExcelBuffer(buffer: Buffer, fileName?: string) {
  ensureDirectories();

  // Validate workbook
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('فایل اکسل ارسالی فاقد شیت یا داده معتبر است.');
  }

  // Save to primary data path
  fs.writeFileSync(EXCEL_FILE_PATH, buffer);

  // Sync to public static path for direct download
  try {
    fs.copyFileSync(EXCEL_FILE_PATH, PUBLIC_EXCEL_PATH);
  } catch (e) {
    console.warn('Could not sync to public path:', e);
  }

  const stat = fs.statSync(EXCEL_FILE_PATH);
  return {
    success: true,
    sheetNames: workbook.SheetNames,
    size: stat.size,
    lastModified: stat.mtimeMs,
  };
}

