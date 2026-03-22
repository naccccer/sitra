import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPN } from '../../../utils/helpers';
import { usersAccessApi } from '../services/usersAccessApi';

// ─── Constants ────────────────────────────────────────────────────────────────

export const OWNER_ROLE_OPTIONS = [
  { value: 'admin', label: 'ادمین' },
];

export const FACTORY_ROLE_OPTIONS = [
  { value: 'manager', label: 'مدیر' },
  { value: 'sales', label: 'فروش' },
];

export const ALL_ROLE_OPTIONS = [...OWNER_ROLE_OPTIONS, ...FACTORY_ROLE_OPTIONS];

const MODULE_LABELS = {
  sales: 'فروش',
  customers: 'مشتریان',
  inventory: 'انبار',
  'users-access': 'کاربران و دسترسی',
  'master-data': 'داده‌های پایه',
  kernel: 'هسته',
};

// ─── Pure Utilities ───────────────────────────────────────────────────────────

export const roleLabel = (role) => ALL_ROLE_OPTIONS.find((option) => option.value === role)?.label || String(role || 'manager');

export const roleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-indigo-100 text-indigo-700';
  if (role === 'manager') return 'bg-slate-100 text-slate-700';
  if (role === 'sales') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
};

export const formatDateTime = (value) => {
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY_CREATE_DRAFT = { username: '', fullName: '', jobTitle: '', password: '', role: 'manager' };
const EMPTY_EDIT_DRAFT = { username: '', fullName: '', jobTitle: '', role: 'manager', password: '' };

export const useAdminUsersSettings = ({ session, onRefreshSession }) => {
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

  const [createDraft, setCreateDraft] = useState(EMPTY_CREATE_DRAFT);
  const [editingUserId, setEditingUserId] = useState('');
  const [editDraft, setEditDraft] = useState(EMPTY_EDIT_DRAFT);

  const [matrixRoles, setMatrixRoles] = useState(availableRoleOptions.map((role) => role.value));
  const [permissionDefinitions, setPermissionDefinitions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [savedRolePermissions, setSavedRolePermissions] = useState({});
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  // ─── Data Loading ──────────────────────────────────────────────────────────

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

  // ─── Derived State ─────────────────────────────────────────────────────────

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

  // ─── Permission Matrix Handlers ────────────────────────────────────────────

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

  const handleResetMatrix = () => {
    setRolePermissions(savedRolePermissions);
    setErrorMsg('');
    setSuccessMsg('تغییرات بازنشانی شد.');
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

  // ─── User CRUD Handlers ────────────────────────────────────────────────────

  const handleCreateUser = async () => {
    const username = String(createDraft.username || '').trim();
    const fullName = String(createDraft.fullName || '').trim();
    const jobTitle = String(createDraft.jobTitle || '').trim();
    const password = String(createDraft.password || '');
    const role = String(createDraft.role || 'manager');

    if (!username) {
      setErrorMsg('نام کاربری الزامی است.');
      return;
    }
    if (!fullName) {
      setErrorMsg('نام کاربر الزامی است.');
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
      const response = await usersAccessApi.createUser({ username, fullName, jobTitle, password, role });
      if (response?.user) {
        setUsers((prev) => [response.user, ...prev].sort(userSort));
      } else {
        await loadData();
      }
      setCreateDraft(EMPTY_CREATE_DRAFT);
      setSuccessMsg('کاربر جدید ایجاد شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ایجاد کاربر ناموفق بود.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (payload) => {
    if (String(payload?.fullName || '').trim() === '') {
      setErrorMsg('نام کاربر الزامی است.');
      return;
    }
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
      setEditDraft(EMPTY_EDIT_DRAFT);
      if (typeof onRefreshSession === 'function') {
        await onRefreshSession();
      }
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

  // ─── Edit Row Helpers ──────────────────────────────────────────────────────

  const startEditing = (user) => {
    setEditingUserId(String(user.id));
    setEditDraft({
      username: String(user.username || ''),
      fullName: String(user.fullName || user.username || ''),
      jobTitle: String(user.jobTitle || ''),
      role: String(user.role || 'manager'),
      password: '',
    });
  };

  const cancelEditing = () => {
    setEditingUserId('');
    setEditDraft(EMPTY_EDIT_DRAFT);
  };

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // lists
    users,
    matrixRoles,
    groups,
    // loading flags
    isLoading,
    isCreating,
    busyUserId,
    isSavingMatrix,
    // feedback
    errorMsg,
    successMsg,
    // permission matrix
    rolePermissions,
    expandedModules,
    hasMatrixChanges,
    moduleStatus,
    // create form
    createDraft,
    setCreateDraft,
    // edit form
    editingUserId,
    editDraft,
    setEditDraft,
    // role config for selects
    availableRoleOptions,
    // session context
    session,
    // handlers
    handleCreateUser,
    handleUpdateUser,
    handleToggleActive,
    handleSaveMatrix,
    handleResetMatrix,
    setModuleEnabled,
    toggleRolePermission,
    toggleModuleExpanded,
    startEditing,
    cancelEditing,
  };
};
