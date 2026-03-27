import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersAccessApi } from '../services/usersAccessApi';

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
  'master-data': 'اطلاعات پایه',
  kernel: 'هسته',
};

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

export const useAdminUsersRoleMatrix = ({ canManageSystemSettings, onRefreshSession, setErrorMsg, setSuccessMsg }) => {
  const availableRoleOptions = useMemo(
    () => (canManageSystemSettings ? ALL_ROLE_OPTIONS : FACTORY_ROLE_OPTIONS),
    [canManageSystemSettings],
  );
  const availableRoleSet = useMemo(
    () => new Set(availableRoleOptions.map((role) => role.value)),
    [availableRoleOptions],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [matrixRoles, setMatrixRoles] = useState(availableRoleOptions.map((role) => role.value));
  const [permissionDefinitions, setPermissionDefinitions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [savedRolePermissions, setSavedRolePermissions] = useState({});
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  const loadMatrix = useCallback(async () => {
    const matrixResponse = await usersAccessApi.fetchRolePermissions();
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
  }, [availableRoleOptions, availableRoleSet]);

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

  useEffect(() => {
    setMatrixRoles((prev) => {
      const fallback = availableRoleOptions.map((role) => role.value);
      return prev.length > 0 ? prev.filter((role) => availableRoleSet.has(role)) : fallback;
    });
  }, [availableRoleOptions, availableRoleSet]);

  return {
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
  };
};
