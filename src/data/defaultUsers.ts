import { AppUser } from '../types/user';

export const INITIAL_USERS: AppUser[] = [
  // Admin
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
  // Sample Students
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
  // Sample Professors
  {
    id: 'usr_prof_1',
    username: 'dr.zamani',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر فرساد زمانی',
    code: 'PROF-101',
    department: 'مهندسی کامپیوتر',
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
    academicRank: 'دانشیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_4',
    username: 'dr.adabi',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر سحر آدابی',
    code: 'PROF-104',
    department: 'شبکه‌های کامپیوتری',
    academicRank: 'استادیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_5',
    username: 'dr.akbari',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر جواد اکبری',
    code: 'PROF-105',
    department: 'هوش مصنوعی',
    academicRank: 'استادیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
  {
    id: 'usr_prof_6',
    username: 'dr.derakhshan',
    password: '123456',
    role: 'professor',
    fullName: 'دکتر پویا درخشان برجوئی',
    code: 'PROF-106',
    department: 'فناوری اطلاعات',
    academicRank: 'استادیار',
    isActive: true,
    createdAt: '1405/06/01',
  },
];

const STORAGE_USERS_KEY = 'defense_system_users_v2';
const STORAGE_CURRENT_USER_KEY = 'defense_current_user_v2';

export function getStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading stored users:', err);
  }
  return INITIAL_USERS;
}

export function saveStoredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving users to storage:', err);
  }
}

export function getStoredCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading current user:', err);
  }
  return null;
}

export function saveStoredCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Error saving current user:', err);
  }
}
