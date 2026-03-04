import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Loader2, Pencil, RotateCcw, Save, Trash2, UserPlus, X } from 'lucide-react';
import { toPN } from '../../../utils/helpers';
import { usersAccessApi } from '../services/usersAccessApi';

const OWNER_ROLE_OPTIONS = [
  { value: 'admin', label: 'ادمین' },
];

const FACTORY_ROLE_OPTIONS = [
  { value: 'manager', label: 'مدیر' },
  { value: 'sales', label: 'فروش' },
  { value: 'production', label: 'تولید' },
  { value: 'inventory', label: 'انبار' },
];

const ALL_ROLE_OPTIONS = [...OWNER_ROLE_OPTIONS, ...FACTORY_ROLE_OPTIONS];

const MODULE_LABELS = {
  sales: 'فروش',
  production: 'تولید',
  inventory: 'انبار',
  'users-access': 'کاربران و دسترسی',
  'master-data': 'داده‌های پایه',
  kernel: 'هسته',
};

const roleLabel = (role) => ALL_ROLE_OPTIONS.find((option) => option.value === role)?.label || String(role || 'manager');

const roleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-indigo-100 text-indigo-700';
  if (role === 'manager') return 'bg-slate-100 text-slate-700';
  if (role === 'sales') return 'bg-blue-100 text-blue-700';
  if (role === 'production') return 'bg-amber-100 text-amber-700';
  if (role === 'inventory') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return toPN(date.toLocaleString('fa-IR'));
};

const userSort = (a, b) => Number(b.id || 0) - Number(a.id || 0);

const normalizeRolePermissions = (roles, source) => {
  const safeSource = source && typeof source === 'object' ? source : {};
  const normalized = {};

  roles.forEach((role) => {
    const candidate = Array.isArray(safeSource[role]) ? safeSource[role] : [];
    normalized[role] = Array.from(new Set(candidate.map((permission) => String(permission || '').trim()).filter(Boolean))).sort();
  });

  return normalized;
};

const rolePermissionsEqual = (a, b, roles) => (
  roles.every((role) => JSON.stringify(Array.isArray(a?.[role]) ? a[role] : []) === JSON.stringify(Array.isArray(b?.[role]) ? b[role] : []))
);

const buildPermissionGroups = (definitions, rolePermissions) => {
  const hasDefinitions = Array.isArray(definitions) && definitions.length > 0;
  const source = hasDefinitions
    ? definitions
    : Array.from(new Set(Object.values(rolePermissions || {}).flatMap((list) => (Array.isArray(list) ? list : []))))
      .map((key) => ({ key, module: String(key || '').split('.')[0] || 'other', label: String(key || '') }));

  const grouped = new Map();
  source.forEach((item) => {
    const key = String(item?.key || '').trim();
    if (!key) return;

    const moduleId = String(item?.module || '').trim() || key.split('.')[0] || 'other';
    if (!grouped.has(moduleId)) {
      grouped.set(moduleId, {
        id: moduleId,
        label: MODULE_LABELS[moduleId] || moduleId,
        items: [],
      });
    }

    grouped.get(moduleId).items.push({
      key,
      label: String(item?.label || key).trim() || key,
    });
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.label.localeCompare(b.label, 'fa')),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fa'));
};

export const AdminUsersSettingsTab = ({ session, onRefreshSession }) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings);
  const availableRoleOptions = useMemo(
    () => (canManageSystemSettings ? ALL_ROLE_OPTIONS : FACTORY_ROLE_OPTIONS),
    [canManageSystemSettings],
  );
  const availableRoleSet = useMemo(
    () => new Set(availableRoleOptions.map((role) => role.value)),
    [availableRoleOptions],
  );
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [createDraft, setCreateDraft] = useState({ username: '', password: '', role: 'manager' });
  const [editingUserId, setEditingUserId] = useState('');
  const [editDraft, setEditDraft] = useState({ username: '', role: 'manager', password: '' });

  const [matrixRoles, setMatrixRoles] = useState(availableRoleOptions.map((role) => role.value));
  const [permissionDefinitions, setPermissionDefinitions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [savedRolePermissions, setSavedRolePermissions] = useState({});
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [usersResponse, matrixResponse] = await Promise.all([
        usersAccessApi.fetchUsers(),
        usersAccessApi.fetchRolePermissions(),
      ]);

      setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users.slice().sort(userSort) : []);

      const roles = Array.isArray(matrixResponse?.roles) && matrixResponse.roles.length > 0
        ? matrixResponse.roles.map((role) => String(role || '').trim()).filter(Boolean)
        : availableRoleOptions.map((role) => role.value);
      const filteredRoles = roles.filter((role) => availableRoleSet.has(role));
      const effectiveRoles = filteredRoles.length > 0 ? filteredRoles : availableRoleOptions.map((role) => role.value);
      const normalized = normalizeRolePermissions(effectiveRoles, matrixResponse?.rolePermissions);

      setMatrixRoles(effectiveRoles);
      setRolePermissions(normalized);
      setSavedRolePermissions(normalized);
      setPermissionDefinitions(Array.isArray(matrixResponse?.permissionDefinitions) ? matrixResponse.permissionDefinitions : []);
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت اطلاعات ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, [availableRoleOptions, availableRoleSet]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasMatrixChanges = useMemo(
    () => !rolePermissionsEqual(rolePermissions, savedRolePermissions, matrixRoles),
    [matrixRoles, rolePermissions, savedRolePermissions],
  );

  const groups = useMemo(
    () => buildPermissionGroups(permissionDefinitions, rolePermissions),
    [permissionDefinitions, rolePermissions],
  );

  const moduleStatus = useCallback((role, group) => {
    const currentPermissions = new Set(Array.isArray(rolePermissions?.[role]) ? rolePermissions[role] : []);
    const total = group.items.length;
    const enabled = group.items.reduce((count, item) => (currentPermissions.has(item.key) ? count + 1 : count), 0);
    return {
      total,
      enabled,
      checked: enabled === total && total > 0,
    };
  }, [rolePermissions]);

  const setModuleEnabled = (role, group, enabled) => {
    setRolePermissions((prev) => {
      const current = new Set(Array.isArray(prev?.[role]) ? prev[role] : []);
      group.items.forEach((item) => {
        if (enabled) current.add(item.key);
        else current.delete(item.key);
      });
      return {
        ...prev,
        [role]: Array.from(current).sort(),
      };
    });
  };

  const toggleRolePermission = (role, permissionKey) => {
    setRolePermissions((prev) => {
      const current = new Set(Array.isArray(prev?.[role]) ? prev[role] : []);
      if (current.has(permissionKey)) current.delete(permissionKey);
      else current.add(permissionKey);
      return {
        ...prev,
        [role]: Array.from(current).sort(),
      };
    });
  };

  const toggleModuleExpanded = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = normalizeRolePermissions(matrixRoles, rolePermissions);
      const response = await usersAccessApi.saveRolePermissions(payload);

      const roles = Array.isArray(response?.roles) && response.roles.length > 0
        ? response.roles.map((role) => String(role || '').trim()).filter(Boolean)
        : matrixRoles;
      const normalized = normalizeRolePermissions(roles, response?.rolePermissions || payload);

      setMatrixRoles(roles);
      setRolePermissions(normalized);
      setSavedRolePermissions(normalized);
      if (Array.isArray(response?.permissionDefinitions)) {
        setPermissionDefinitions(response.permissionDefinitions);
      }

      if (typeof onRefreshSession === 'function') {
        await onRefreshSession();
      }

      setSuccessMsg('جدول دسترسی ذخیره شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ذخیره جدول دسترسی ناموفق بود.');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const handleCreateUser = async () => {
    const username = String(createDraft.username || '').trim();
    const password = String(createDraft.password || '');
    const role = String(createDraft.role || 'manager');

    if (!username) {
      setErrorMsg('نام کاربری الزامی است.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('رمز عبور باید حداقل 6 کاراکتر باشد.');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await usersAccessApi.createUser({ username, password, role });
      if (response?.user) {
        setUsers((prev) => [response.user, ...prev].sort(userSort));
      } else {
        await loadData();
      }
      setCreateDraft({ username: '', password: '', role: 'manager' });
      setSuccessMsg('کاربر جدید ایجاد شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ایجاد کاربر ناموفق بود.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (payload) => {
    setBusyUserId(String(payload.id));
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await usersAccessApi.updateUser(payload);
      if (response?.user) {
        setUsers((prev) => prev.map((user) => (String(user.id) === String(payload.id) ? response.user : user)).sort(userSort));
      } else {
        await loadData();
      }

      setEditingUserId('');
      setEditDraft({ username: '', role: 'manager', password: '' });
      setSuccessMsg('کاربر به‌روزرسانی شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ویرایش کاربر ناموفق بود.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleToggleActive = async (user) => {
    const nextActive = !user.isActive;
    const title = nextActive ? 'فعال‌سازی کاربر' : 'غیرفعال‌سازی کاربر';
    const confirmed = window.confirm(`آیا از ${title} حساب "${user.username}" مطمئن هستید؟`);
    if (!confirmed) return;

    setBusyUserId(String(user.id));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await usersAccessApi.setUserActive(Number(user.id), nextActive);
      if (response?.user) {
        setUsers((prev) => prev.map((item) => (String(item.id) === String(user.id) ? response.user : item)).sort(userSort));
      } else {
        await loadData();
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
        <div className="mb-3 text-sm font-black text-slate-800">ایجاد کاربر جدید</div>
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
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-800">جدول نقش‌ها و مجوزهای دسترسی</div>
            <div className="text-[11px] font-bold text-slate-500">هر ستون یک نقش است. هر ماژول را می‌توانید برای هر نقش فعال کنید.</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRolePermissions(savedRolePermissions);
                setErrorMsg('');
                setSuccessMsg('تغییرات بازنشانی شد.');
              }}
              disabled={!hasMatrixChanges || isSavingMatrix}
              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${(!hasMatrixChanges || isSavingMatrix) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <RotateCcw size={12} />
              بازنشانی
            </button>
            <button
              type="button"
              onClick={handleSaveMatrix}
              disabled={!hasMatrixChanges || isSavingMatrix}
              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${(!hasMatrixChanges || isSavingMatrix) ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
            >
              {isSavingMatrix ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              ذخیره جدول
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-xs font-black text-slate-500 inline-flex w-full items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-xs">
              <colgroup>
                <col className="w-[300px]" />
                {matrixRoles.map((role) => (
                  <col key={`main-col-${role}`} className="w-[130px]" />
                ))}
              </colgroup>
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2 text-right font-black">ماژول / مجوزها</th>
                  {matrixRoles.map((role) => (
                    <th key={role} className="p-2 text-center font-black">{roleLabel(role)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => {
                  const isExpanded = Boolean(expandedModules[group.id]);
                  return (
                    <React.Fragment key={group.id}>
                      <tr>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => toggleModuleExpanded(group.id)}
                            className="w-full flex items-center gap-2 text-right"
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronLeft size={14} className="text-slate-500" />}
                            <span className="font-black text-slate-800">{group.label}</span>
                            <span className="text-[10px] font-bold text-slate-500">{toPN(group.items.length)} مورد</span>
                          </button>
                        </td>
                        {matrixRoles.map((role) => {
                          const status = moduleStatus(role, group);
                          return (
                            <td key={`${group.id}-${role}`} className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={status.checked}
                                disabled={isSavingMatrix}
                                onChange={() => setModuleEnabled(role, group, !status.checked)}
                                className="h-4 w-4 accent-slate-900 cursor-pointer"
                              />
                              <div className="mt-1 text-[10px] font-bold text-slate-400">
                                {toPN(status.enabled)}/{toPN(status.total)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={matrixRoles.length + 1} className="p-0">
                            <div className="border-t border-sky-200 bg-sky-50/60 p-2">
                              <table className="w-full min-w-[980px] table-fixed text-xs">
                                <colgroup>
                                  <col className="w-[300px]" />
                                  {matrixRoles.map((role) => (
                                    <col key={`detail-col-${group.id}-${role}`} className="w-[130px]" />
                                  ))}
                                </colgroup>
                                <tbody className="divide-y divide-sky-100">
                                  {group.items.map((permission) => (
                                    <tr key={`${group.id}-${permission.key}`} className="hover:bg-white/70">
                                      <td className="p-2 font-bold text-slate-700">{permission.label}</td>
                                      {matrixRoles.map((role) => {
                                        const checked = Array.isArray(rolePermissions?.[role]) && rolePermissions[role].includes(permission.key);
                                        return (
                                          <td key={`${group.id}-${permission.key}-${role}`} className="p-2 text-center">
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              disabled={isSavingMatrix}
                                              onChange={() => toggleRolePermission(role, permission.key)}
                                              className="h-4 w-4 accent-slate-900 cursor-pointer"
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <th className="p-2 text-right font-black">آخرین به‌روزرسانی</th>
                  <th className="p-2 text-center font-black">اقدامات</th>
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
                              onClick={() => handleUpdateUser({
                                id: Number(user.id),
                                username: String(editDraft.username || '').trim(),
                                role: String(editDraft.role || 'manager'),
                                ...(editDraft.password ? { password: editDraft.password } : {}),
                              })}
                              disabled={isBusy}
                              className="h-8 px-2 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId('');
                                setEditDraft({ username: '', role: 'manager', password: '' });
                              }}
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
                              onClick={() => {
                                setEditingUserId(String(user.id));
                                setEditDraft({
                                  username: String(user.username || ''),
                                  role: String(user.role || 'manager'),
                                  password: '',
                                });
                              }}
                              className="h-8 px-2 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <Pencil size={12} />
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              disabled={isBusy || (isCurrentUser && user.isActive)}
                              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${user.isActive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} ${(isBusy || (isCurrentUser && user.isActive)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : user.isActive ? <Trash2 size={12} /> : <RotateCcw size={12} />}
                              {user.isActive ? 'غیرفعال‌کردن' : 'فعال‌سازی کاربر'}
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

