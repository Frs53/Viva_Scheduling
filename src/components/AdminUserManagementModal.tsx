import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  FileSpreadsheet, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Phone,
  Award,
  RefreshCw,
  Eye,
  EyeOff,
  UploadCloud
} from 'lucide-react';
import { AppUser, UserRole } from '../types/user';
import { ColumnDefinition, DefenseRecord } from '../types/defense';
import { ensureDoctorPrefix, isProfessorColumn, normalizePersian } from '../utils/persianUtils';
import { exportToExcel } from '../utils/excelParser';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  onUpdateUsers: (updatedUsers: AppUser[]) => void;
  records: DefenseRecord[];
  columns: ColumnDefinition[];
  onOpenUploadModal?: () => void;
  onOpenLocalFileModal?: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onUpdateUsers,
  records,
  columns,
  onOpenUploadModal,
  onOpenLocalFileModal,
}) => {
  const [activeTab, setActiveTab] = useState<'professors' | 'new_user' | 'all_users'>('professors');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'professor' | 'admin'>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New User Form State
  const [newUserRole, setNewUserRole] = useState<'student' | 'professor'>('student');
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newAcademicRank, setNewAcademicRank] = useState('استادیار');
  const [newPhone, setNewPhone] = useState('');

  // Editing User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AppUser>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Calculate defense counts per professor from records
  const professorDefenseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const profCols = columns.filter(c => isProfessorColumn(c.label) || isProfessorColumn(c.originalKey));

    records.forEach(rec => {
      profCols.forEach(col => {
        const val = rec[col.id] || rec[col.originalKey];
        if (val) {
          const strVal = String(val).trim();
          if (strVal && strVal !== '-' && strVal !== '—' && strVal !== 'ندارد') {
            const profName = ensureDoctorPrefix(strVal);
            counts[profName] = (counts[profName] || 0) + 1;
          }
        }
      });
    });
    return counts;
  }, [records, columns]);

  // Combined list of professors (both in users table and dynamically extracted from records)
  const professorsList = useMemo(() => {
    return users.filter(u => u.role === 'professor');
  }, [users]);

  // Filtered users for "all_users" tab
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!searchTerm.trim()) return true;
      const term = normalizePersian(searchTerm);
      return (
        normalizePersian(u.fullName).includes(term) ||
        u.username.toLowerCase().includes(term.toLowerCase()) ||
        (u.code && u.code.includes(term)) ||
        (u.department && normalizePersian(u.department).includes(term))
      );
    });
  }, [users, roleFilter, searchTerm]);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Creating New User
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showToast('لطفاً نام و نام خانوادگی، نام کاربری و کلمه عبور را تکمیل نمایید.', 'error');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      showToast('این نام کاربری از قبل در سامانه ثبت شده است. لطفاً نام کاربری دیگری انتخاب نمایید.', 'error');
      return;
    }

    let finalName = newFullName.trim();
    if (newUserRole === 'professor') {
      finalName = ensureDoctorPrefix(finalName);
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      username: cleanUsername,
      password: newPassword.trim(),
      role: newUserRole,
      fullName: finalName,
      code: newCode.trim() || undefined,
      department: newDepartment.trim() || undefined,
      academicRank: newUserRole === 'professor' ? newAcademicRank : undefined,
      phone: newPhone.trim() || undefined,
      isActive: true,
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };

    const updated = [newUser, ...users];
    onUpdateUsers(updated);

    // Reset Form
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewCode('');
    setNewDepartment('');
    setNewPhone('');

    showToast(`کاربر جدید «${finalName}» با موفقیت تعریف شد و به شیت کاربران اضافه گردید.`);
    if (newUserRole === 'professor') {
      setActiveTab('professors');
    } else {
      setActiveTab('all_users');
    }
  };

  // Handle Starting Edit for a User
  const handleStartEdit = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditFormData({ ...user });
  };

  // Handle Saving Edited User
  const handleSaveEdit = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        let name = editFormData.fullName?.trim() || u.fullName;
        if (u.role === 'professor') {
          name = ensureDoctorPrefix(name);
        }
        return {
          ...u,
          ...editFormData,
          fullName: name,
        };
      }
      return u;
    });

    onUpdateUsers(updated);
    setEditingUserId(null);
    setEditFormData({});
    showToast('تغییرات با موفقیت ذخیره شد.');
  };

  // Handle Deleting User
  const handleDeleteUser = (userId: string, name: string) => {
    if (confirm(`آیا از حذف کاربر «${name}» اطمینان دارید؟`)) {
      const updated = users.filter(u => u.id !== userId);
      onUpdateUsers(updated);
      showToast(`کاربر «${name}» حذف گردید.`);
    }
  };

  // Toggle user active status
  const handleToggleStatus = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  // Export excel with users sheet
  const handleExportExcelWithUsers = () => {
    exportToExcel(records, columns, 'form_defa.xlsx', users);
    showToast('فایل form_defa.xlsx با هر دو شیت جلسات دفاع و کاربران دانلود شد.');
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="bg-[#121216] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden text-slate-200 my-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#16161c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                  مدیریت کاربران و ویرایش اساتید
                </h3>
                <span className="text-xs bg-amber-950/60 text-amber-300 border border-amber-700/50 px-2.5 py-0.5 rounded-full font-medium">
                  پنل اختصاصی ادمین
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعریف کاربران دانشجو و استاد جدید، ویرایش لیست اساتید، و ذخیره خودکار در شیت دوم فایل اکسل form_defa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcelWithUsers}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
              title="دانلود فایل اکسل form_defa.xlsx شامل شیت جلسات دفاع و شیت کاربران"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>خروجی اکسل با شیت کاربران</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between border-b ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-[#14141a] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('professors')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'professors'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>ویرایش لیست اساتید ({professorsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_user')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'new_user'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>تعریف کاربر جدید (دانشجو یا استاد)</span>
          </button>

          <button
            onClick={() => setActiveTab('all_users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'all_users'
                ? 'border-blue-500 text-blue-300 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>تمام کاربران سامانه ({users.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0f0f13]">
          {/* TAB 1: LIST & EDIT PROFESSORS */}
          {activeTab === 'professors' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16161e] p-3.5 rounded-xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>فهرست و ویرایش مشخصات اساتید</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    امکان ویرایش نام، رتبه علمی، گروه آموزشی، نام کاربری و رمز عبور اساتید برای ورود و ثبت دفاع
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewUserRole('professor');
                    setActiveTab('new_user');
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>افزودن استاد جدید</span>
                </button>
              </div>

              {/* Professors Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#141419]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#181822] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3 w-12 text-center">ردیف</th>
                      <th className="p-3">نام و نام خانوادگی استاد</th>
                      <th className="p-3">رتبه علمی</th>
                      <th className="p-3">گروه آموزشی / دانشکده</th>
                      <th className="p-3">نام کاربری</th>
                      <th className="p-3">کلمه عبور</th>
                      <th className="p-3 text-center">تعداد دفاع‌ها</th>
                      <th className="p-3 text-center">وضعیت</th>
                      <th className="p-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {professorsList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          استادی ثبت نشده است. از دکمه «افزودن استاد جدید» استفاده کنید.
                        </td>
                      </tr>
                    ) : (
                      professorsList.map((prof, idx) => {
                        const isEditing = editingUserId === prof.id;
                        const defensesCount = professorDefenseCounts[ensureDoctorPrefix(prof.fullName)] || 0;
                        const isPassVisible = !!showPasswordMap[prof.id];

                        return (
                          <tr key={prof.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                            
                            {/* Full Name */}
                            <td className="p-3 font-medium text-slate-100">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.fullName || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                  className="w-full bg-slate-900 border border-purple-500 rounded px-2 py-1 text-xs text-white"
                                  placeholder="نام استاد..."
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-purple-300">{ensureDoctorPrefix(prof.fullName)}</span>
                                  {prof.code && (
                                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                                      {prof.code}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Academic Rank */}
                            <td className="p-3 text-slate-300">
                              {isEditing ? (
                                <select
                                  value={editFormData.academicRank || 'استادیار'}
                                  onChange={(e) => setEditFormData({ ...editFormData, academicRank: e.target.value })}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                >
                                  <option value="مربی">مربی</option>
                                  <option value="استادیار">استادیار</option>
                                  <option value="دانشیار">دانشیار</option>
                                  <option value="استاد تمام">استاد تمام</option>
                                </select>
                              ) : (
                                <span className="bg-purple-950/60 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {prof.academicRank || 'استادیار'}
                                </span>
                              )}
                            </td>

                            {/* Department */}
                            <td className="p-3 text-slate-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.department || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                  placeholder="گروه آموزشی..."
                                />
                              ) : (
                                <span>{prof.department || '—'}</span>
                              )}
                            </td>

                            {/* Username */}
                            <td className="p-3 text-slate-400 font-mono text-left" dir="ltr">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.username || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value.toLowerCase() })}
                                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              ) : (
                                prof.username
                              )}
                            </td>

                            {/* Password */}
                            <td className="p-3 text-slate-400 font-mono text-left" dir="ltr">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.password || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span>{isPassVisible ? (prof.password || '123456') : '••••••'}</span>
                                  <button
                                    onClick={() => toggleShowPassword(prof.id)}
                                    className="text-slate-500 hover:text-slate-300 p-0.5"
                                    title="نمایش رمز"
                                  >
                                    {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Defense Count */}
                            <td className="p-3 text-center">
                              <span className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
                                {defensesCount} دفاع
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleStatus(prof.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                  prof.isActive 
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900' 
                                    : 'bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900'
                                }`}
                              >
                                {prof.isActive ? 'فعال' : 'غیرفعال'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleSaveEdit(prof.id)}
                                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                                    title="ذخیره تغییرات"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(null);
                                      setEditFormData({});
                                    }}
                                    className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                    title="انصراف"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(prof)}
                                    className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
                                    title="ویرایش مشخصات استاد"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(prof.id, prof.fullName)}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                    title="حذف استاد"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DEFINE NEW USER (STUDENT OR PROFESSOR) */}
          {activeTab === 'new_user' && (
            <div className="max-w-2xl mx-auto bg-[#14141c] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-base">تعریف کاربر جدید در سامانه</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    کاربر تعریف‌شده می‌تواند با نام کاربری و رمز خود وارد شده و اقدام به ثبت جلسه دفاع نماید
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateNewUser} className="space-y-4">
                {/* Role Switcher */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">نقش کاربر</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('student')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        newUserRole === 'student'
                          ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>کاربر دانشجو</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewUserRole('professor')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        newUserRole === 'professor'
                          ? 'bg-purple-950/60 border-purple-600 text-purple-300 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>کاربر استاد</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      نام و نام خانوادگی {newUserRole === 'professor' && '(پیشوند دکتر خودکار افزوده می‌شود)'}
                    </label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder={newUserRole === 'student' ? 'مثال: محمد امینی' : 'مثال: علیرضا حسینی'}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Student Code or Professor Code */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      {newUserRole === 'student' ? 'شماره دانشجویی' : 'کد پرسنلی / استادی'}
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder={newUserRole === 'student' ? 'مثال: 40123456' : 'مثال: PROF-201'}
                      dir="ltr"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">نام کاربری (جهت ورود)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={newUserRole === 'student' ? 'std_401...' : 'dr.name...'}
                      dir="ltr"
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">کلمه عبور</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="کلمه عبور (مثلاً 123456)..."
                      dir="ltr"
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">گروه آموزشی / دانشکده</label>
                    <input
                      type="text"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="مثال: مهندسی کامپیوتر، نرم‌افزار، هوش مصنوعی..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Academic Rank (for Professor) or Phone (for Student) */}
                  {newUserRole === 'professor' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">رتبه علمی</label>
                      <select
                        value={newAcademicRank}
                        onChange={(e) => setNewAcademicRank(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      >
                        <option value="استادیار">استادیار</option>
                        <option value="دانشیار">دانشیار</option>
                        <option value="استاد تمام">استاد تمام</option>
                        <option value="مربی">مربی</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">شماره تماس دانشجو</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="0912..."
                        dir="ltr"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>ثبت و ذخیره در جدول کاربران</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ALL USERS TABLE */}
          {activeTab === 'all_users' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#16161e] p-3.5 rounded-xl border border-slate-800">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجو در نام، نام کاربری، کد یا رشته..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>

                {/* Role Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'student', 'professor', 'admin'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        roleFilter === role
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {role === 'all' && 'همه'}
                      {role === 'student' && 'دانشجویان'}
                      {role === 'professor' && 'اساتید'}
                      {role === 'admin' && 'مدیران'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#141419]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#181822] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3 w-12 text-center">ردیف</th>
                      <th className="p-3">نقش</th>
                      <th className="p-3">نام و نام خانوادگی</th>
                      <th className="p-3">نام کاربری</th>
                      <th className="p-3">کلمه عبور</th>
                      <th className="p-3">کد شناسایی</th>
                      <th className="p-3">گروه / رشته</th>
                      <th className="p-3 text-center">وضعیت</th>
                      <th className="p-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          کاربری یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, idx) => {
                        const isEditing = editingUserId === user.id;
                        const isPassVisible = !!showPasswordMap[user.id];

                        return (
                          <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                            
                            {/* Role Badge */}
                            <td className="p-3">
                              {user.role === 'admin' && (
                                <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                                  مدیر سیستم
                                </span>
                              )}
                              {user.role === 'professor' && (
                                <span className="bg-purple-950/60 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                                  استاد
                                </span>
                              )}
                              {user.role === 'student' && (
                                <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                                  دانشجو
                                </span>
                              )}
                            </td>

                            {/* Full Name */}
                            <td className="p-3 font-semibold text-slate-100">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.fullName || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                  className="w-full bg-slate-900 border border-blue-500 rounded px-2 py-1 text-xs text-white"
                                />
                              ) : (
                                user.fullName
                              )}
                            </td>

                            {/* Username */}
                            <td className="p-3 text-slate-400 font-mono text-left" dir="ltr">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.username || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value.toLowerCase() })}
                                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              ) : (
                                user.username
                              )}
                            </td>

                            {/* Password */}
                            <td className="p-3 text-slate-400 font-mono text-left" dir="ltr">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.password || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span>{isPassVisible ? (user.password || '123456') : '••••••'}</span>
                                  <button
                                    onClick={() => toggleShowPassword(user.id)}
                                    className="text-slate-500 hover:text-slate-300 p-0.5"
                                  >
                                    {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Code */}
                            <td className="p-3 text-slate-400 font-mono text-left" dir="ltr">
                              {user.code || '—'}
                            </td>

                            {/* Department */}
                            <td className="p-3 text-slate-300">
                              {user.department || '—'}
                            </td>

                            {/* Status */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                  user.isActive 
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900' 
                                    : 'bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900'
                                }`}
                              >
                                {user.isActive ? 'فعال' : 'غیرفعال'}
                              </button>
                            </td>

                            {/* Operations */}
                            <td className="p-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleSaveEdit(user.id)}
                                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(null);
                                      setEditFormData({});
                                    }}
                                    className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(user)}
                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                    title="ویرایش کاربر"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {user.role !== 'admin' && (
                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.fullName)}
                                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                      title="حذف کاربر"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#16161c] flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>مجموع کاربران: <strong className="text-slate-200">{users.length}</strong></span>
            <span>•</span>
            <span>اساتید: <strong className="text-purple-300">{professorsList.length}</strong></span>
            <span>•</span>
            <span>دانشجویان: <strong className="text-emerald-300">{users.filter(u => u.role === 'student').length}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenUploadModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="بارگذاری فایل اکسل جدید و جایگزینی آن در سامانه"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>بارگذاری فایل اکسل</span>
              </button>
            )}

            {onOpenLocalFileModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLocalFileModal();
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-600/50 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
                title="مشاهده لینک دائم و دانلود فایل form_defa.xlsx"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>فایل اکسل محلی (لینک دائم)</span>
              </button>
            )}

            <button
              onClick={handleExportExcelWithUsers}
              className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600/60 text-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>خروجی فرم اکسل با کاربران</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
