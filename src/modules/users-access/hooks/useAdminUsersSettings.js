import { useCallback, useEffect, useState } from 'react';
import { toPN } from '@/utils/helpers';
import { usersAccessApi } from '../services/usersAccessApi';
import {
  ALL_ROLE_OPTIONS,
  useAdminUsersRoleMatrix,
} from './useAdminUsersRoleMatrix';

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
const EMPTY_CREATE_DRAFT = { username: '', fullName: '', jobTitle: '', password: '', role: 'manager' };
const EMPTY_EDIT_DRAFT = { username: '', fullName: '', jobTitle: '', role: 'manager', password: '' };

export const useAdminUsersSettings = ({ session, onRefreshSession }) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings);

  const [users, setUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [createDraft, setCreateDraft] = useState(EMPTY_CREATE_DRAFT);
  const [editingUserId, setEditingUserId] = useState('');
  const [editDraft, setEditDraft] = useState(EMPTY_EDIT_DRAFT);

  const {
    availableRoleOptions,
    isLoading,
    setIsLoading,
    loadMatrix,
    matrixRoles,
    groups,
    rolePermissions,
    expandedModules,
    hasMatrixChanges,
    moduleStatus,
    isSavingMatrix,
    setModuleEnabled,
    toggleRolePermission,
    toggleModuleExpanded,
    handleResetMatrix,
    handleSaveMatrix,
  } = useAdminUsersRoleMatrix({
    canManageSystemSettings,
    onRefreshSession,
    setErrorMsg,
    setSuccessMsg,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const usersResponse = await usersAccessApi.fetchUsers();
      setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users.slice().sort(userSort) : []);
      await loadMatrix();
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت اطلاعات ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, [loadMatrix, setIsLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return {
    users,
    matrixRoles,
    groups,
    isLoading,
    isCreating,
    busyUserId,
    isSavingMatrix,
    errorMsg,
    successMsg,
    rolePermissions,
    expandedModules,
    hasMatrixChanges,
    moduleStatus,
    createDraft,
    setCreateDraft,
    editingUserId,
    editDraft,
    setEditDraft,
    availableRoleOptions,
    session,
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
