import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ArrowRight
} from 'lucide-react';
import { AppUser } from '../types/user';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  users: AppUser[];
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AppUser | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('لطفاً نام کاربری و کلمه عبور را وارد کنید.');
      return;
    }

    // 1. Check in registered users list
    const found = users.find(u => 
      u.username.trim().toLowerCase() === cleanUser && 
      (u.password?.trim() === cleanPass || (!u.password && cleanPass === '123456'))
    );

    // 2. Or check fallback admin
    if (!found && cleanUser === 'admin' && cleanPass === 'roshd123') {
      const adminUser: AppUser = {
        id: 'usr_admin',
        username: 'admin',
        password: 'roshd123',
        role: 'admin',
        fullName: 'مدیر سامانه تحصیلات تکمیلی',
        code: 'ADMIN-01',
        department: 'تحصیلات تکمیلی',
        isActive: true,
      };
      handleSuccess(adminUser);
      return;
    }

    if (found) {
      if (!found.isActive) {
        setError('حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.');
        return;
      }
      handleSuccess(found);
    } else {
      setError('نام کاربری یا کلمه عبور نادرست است.');
    }
  };

  const handleSuccess = (user: AppUser) => {
    setIsSuccess(true);
    setLoggedInUser(user);
    setTimeout(() => {
      setIsSuccess(false);
      setUsername('');
      setPassword('');
      onLoginSuccess(user);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#121216] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">ورود جهت ثبت دفاع جدید</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                برای ثبت جلسه دفاع، نام کاربری و کلمه عبور خود را وارد نمایید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && loggedInUser && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>ورود موفقیت‌آمیز بود. در حال باز کردن فرم ثبت دفاع...</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              نام کاربری
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                dir="ltr"
                required
                autoFocus
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">کلمه عبور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                required
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              <span>ورود و ثبت دفاع</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
