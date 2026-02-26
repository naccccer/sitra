import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, RotateCcw, Save, Trash2, UserPlus, X } from 'lucide-react';
import { toPN } from '../../../utils/helpers';
import { usersAccessApi } from '../services/usersAccessApi';

const roleOptions = [
  { value: 'manager', label: 'مدیر' },
  { value: 'admin', label: 'ادمین' },
];
const availableRoleOptions = [
  ...roleOptions,
  { value: 'sales', label: 'Sales' },
  { value: 'production', label: 'Production' },
  { value: 'inventory', label: 'Inventory' },
];

const roleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-indigo-100 text-indigo-700';
  if (role === 'manager') return 'bg-slate-100 text-slate-700';
  if (role === 'sales') return 'bg-blue-100 text-blue-700';
  if (role === 'production') return 'bg-amber-100 text-amber-700';
  if (role === 'inventory') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
};

const roleLabel = (role) => availableRoleOptions.find((option) => option.value === role)?.label || String(role || 'manager');

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return toPN(date.toLocaleString('fa-IR'));
};

const userSort = (a, b) => Number(b.id || 0) - Number(a.id || 0);

export const AdminUsersSettingsTab = ({ session }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createDraft, setCreateDraft] = useState({ username: '', password: '', role: 'manager' });
  const [editingUserId, setEditingUserId] = useState('');
  const [editDraft, setEditDraft] = useState({ username: '', role: 'manager', password: '' });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await usersAccessApi.fetchUsers();
      const list = Array.isArray(response?.users) ? response.users.slice().sort(userSort) : [];
      setUsers(list);
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت لیست کاربران ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const usernameSet = useMemo(
    () => new Set(users.map((user) => String(user.username || '').trim().toLowerCase())),
    [users],
  );

  const createValidation = useMemo(() => {
    const username = String(createDraft.username || '').trim();
    const password = String(createDraft.password || '');
    const role = String(createDraft.role || '');
    if (!username) return 'نام کاربری الزامی است.';
    if (usernameSet.has(username.toLowerCase())) return 'این نام کاربری قبلا ثبت شده است.';
    if (password.length < 6) return 'رمز عبور باید حداقل 6 کاراکتر باشد.';
    if (!availableRoleOptions.some((option) => option.value === role)) return 'سطح دسترسی نامعتبر است.';
    return '';
  }, [createDraft, usernameSet]);

  const resetCreateForm = () => {
    setCreateDraft({ username: '', password: '', role: 'manager' });
  };

  const handleCreateUser = async () => {
    if (createValidation) {
      setErrorMsg(createValidation);
      setSuccessMsg('');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        username: String(createDraft.username || '').trim(),
        password: String(createDraft.password || ''),
        role: String(createDraft.role || 'manager'),
      };
      const response = await usersAccessApi.createUser(payload);
      const created = response?.user;
      if (created) {
        setUsers((prev) => [created, ...prev].sort(userSort));
      } else {
        await loadUsers();
      }
      resetCreateForm();
      setSuccessMsg('کاربر جدید ایجاد شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ایجاد کاربر ناموفق بود.');
    } finally {
      setIsCreating(false);
    }
  };

  const beginEdit = (user) => {
    setEditingUserId(String(user.id));
    setEditDraft({
      username: String(user.username || ''),
      role: String(user.role || 'manager'),
      password: '',
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const cancelEdit = () => {
    setEditingUserId('');
    setEditDraft({ username: '', role: 'manager', password: '' });
  };

  const handleSaveEdit = async (user) => {
    const username = String(editDraft.username || '').trim();
    const role = String(editDraft.role || '');
    const password = String(editDraft.password || '');

    if (!username) {
      setErrorMsg('نام کاربری نمی‌تواند خالی باشد.');
      setSuccessMsg('');
      return;
    }
    if (!availableRoleOptions.some((option) => option.value === role)) {
      setErrorMsg('سطح دسترسی نامعتبر است.');
      setSuccessMsg('');
      return;
    }
    if (password && password.length < 6) {
      setErrorMsg('رمز عبور باید حداقل 6 کاراکتر باشد.');
      setSuccessMsg('');
      return;
    }

    setBusyUserId(String(user.id));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        id: Number(user.id),
        username,
        role,
      };
      if (password) payload.password = password;
      const response = await usersAccessApi.updateUser(payload);
      if (response?.user) {
        setUsers((prev) => prev.map((candidate) => (String(candidate.id) === String(user.id) ? response.user : candidate)).sort(userSort));
      } else {
        await loadUsers();
      }
      cancelEdit();
      setSuccessMsg('کاربر بروزرسانی شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ویرایش کاربر ناموفق بود.');
    } finally {
      setBusyUserId('');
    }
  };

  const toggleActive = async (user) => {
    const nextActive = !user.isActive;
    const title = nextActive ? 'فعال‌سازی مجدد' : 'غیرفعال‌سازی';
    const confirmed = window.confirm(`آیا از ${title} کاربر "${user.username}" مطمئن هستید؟`);
    if (!confirmed) return;

    setBusyUserId(String(user.id));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await usersAccessApi.setUserActive(Number(user.id), nextActive);
      if (response?.user) {
        setUsers((prev) => prev.map((candidate) => (String(candidate.id) === String(user.id) ? response.user : candidate)).sort(userSort));
      } else {
        await loadUsers();
      }
      setSuccessMsg(nextActive ? 'کاربر فعال شد.' : 'کاربر غیرفعال شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'تغییر وضعیت کاربر ناموفق بود.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 text-sm font-black text-slate-800">افزودن کاربر جدید</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={createDraft.username}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="نام کاربری"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            dir="ltr"
          />
          <input
            type="password"
            value={createDraft.password}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="رمز عبور (حداقل 6)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            dir="ltr"
          />
          <select
            value={createDraft.role}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, role: e.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
          >
            {availableRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={isCreating}
            className={`h-10 rounded-lg text-xs font-black inline-flex items-center justify-center gap-1.5 ${isCreating ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            افزودن کاربر
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black px-3 py-2">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-2">{successMsg}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-black text-slate-800">لیست کاربران</div>

        {isLoading ? (
          <div className="p-6 text-center text-xs font-black text-slate-500 inline-flex w-full items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            در حال دریافت کاربران...
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-xs font-black text-slate-500">کاربری ثبت نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2 text-right font-black">نام کاربری</th>
                  <th className="p-2 text-right font-black">نقش</th>
                  <th className="p-2 text-right font-black">وضعیت</th>
                  <th className="p-2 text-right font-black">تاریخ ایجاد</th>
                  <th className="p-2 text-right font-black">آخرین بروزرسانی</th>
                  <th className="p-2 text-center font-black">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isEditing = editingUserId === String(user.id);
                  const isBusy = busyUserId === String(user.id);
                  const isCurrentUser = String(session?.username || '') === String(user.username || '');
                  return (
                    <tr key={user.id} className={user.isActive ? '' : 'bg-slate-50/80'}>
                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.username}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, username: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-slate-200 px-2 font-bold"
                            dir="ltr"
                          />
                        ) : (
                          <span className="font-black text-slate-800">{user.username}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <select
                            value={editDraft.role}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, role: e.target.value }))}
                            className="h-8 rounded-lg border border-slate-200 px-2 font-bold"
                          >
                            {availableRoleOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${roleBadgeClass(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {user.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-600">{formatDateTime(user.createdAt)}</td>
                      <td className="p-2 font-bold text-slate-600">{formatDateTime(user.updatedAt)}</td>
                      <td className="p-2">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="password"
                              value={editDraft.password}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, password: e.target.value }))}
                              placeholder="رمز جدید (اختیاری)"
                              className="h-8 w-36 rounded-lg border border-slate-200 px-2 text-[11px] font-bold"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(user)}
                              disabled={isBusy}
                              className="h-8 px-2 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="h-8 px-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <X size={12} />
                              انصراف
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => beginEdit(user)}
                              className="h-8 px-2 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <Pencil size={12} />
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(user)}
                              disabled={isBusy || (isCurrentUser && user.isActive)}
                              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${user.isActive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} ${(isBusy || (isCurrentUser && user.isActive)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={isCurrentUser && user.isActive ? 'غیرفعال‌سازی حساب فعلی مجاز نیست.' : ''}
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : user.isActive ? <Trash2 size={12} /> : <RotateCcw size={12} />}
                              {user.isActive ? 'حذف (غیرفعال‌سازی)' : 'فعال‌سازی مجدد'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
