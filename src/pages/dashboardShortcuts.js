import { BookOpen, ContactRound, Database, Package, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';
import { getNavSections, toNavTarget } from '@/components/layout/sidebarNav';
import { isModuleEnabled } from '@/kernel/moduleRegistry';

const HOME_SHORTCUT_STORAGE_KEY = 'sitra.home.shortcuts.v1';

const HOME_SHORTCUTS = [
  { id: 'orders', label: 'سفارشات', path: '/orders', icon: BookOpen, capability: 'canManageOrders', moduleId: 'sales' },
  { id: 'customers', label: 'مشتریان', path: '/customers', icon: ContactRound, capability: 'canManageCustomers', moduleId: 'customers' },
  { id: 'inventory', label: 'انبار', path: '/inventory', icon: Package, capability: 'canAccessInventory', moduleId: 'inventory' },
  { id: 'accounting', label: 'حسابداری', path: '/accounting', icon: Database, capability: 'canAccessAccounting', moduleId: 'accounting' },
  { id: 'human-resources', label: 'منابع انسانی', path: '/human-resources', icon: UsersRound, capability: 'canAccessHumanResources', moduleId: 'human-resources' },
  { id: 'users-access', label: 'کاربران', path: '/users-access', icon: ShieldCheck, capability: 'canManageUsers', moduleId: 'users-access' },
  { id: 'security-access', label: 'امنیت و دسترسی', path: '/management/audit', icon: SlidersHorizontal, capability: 'canViewAuditLogs' },
  { id: 'master-data', label: 'اطلاعات پایه', path: '/master-data', icon: Database, capability: 'canManageProfile', moduleId: 'master-data' },
];

const isVisibleItem = (item, capabilities, modules) => {
  if (typeof item.when === 'function' && !item.when(capabilities, modules)) return false;
  if (item.capability && !capabilities[item.capability]) return false;
  if (item.moduleId && !isModuleEnabled(modules, item.moduleId)) return false;
  return true;
};

const getItemPrimaryTarget = (item) => {
  if (!Array.isArray(item.children) || item.children.length === 0) return toNavTarget(item);
  if (item.dynamicToFirstVisibleChild) return toNavTarget(item.children[0]);
  const firstTabbedChild = item.children.find((child) => child.to === item.to && child.tab);
  return toNavTarget(firstTabbedChild || item);
};

export const getShortcutStorageKey = (session = {}) => {
  const username = String(session?.username || '').trim();
  const role = String(session?.role || '').trim();
  return `${HOME_SHORTCUT_STORAGE_KEY}:${username || role || 'guest'}`;
};

export const readStoredShortcutIds = (storageKey) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : null;
  } catch {
    return null;
  }
};

export const buildAvailableShortcuts = ({
  capabilities,
  modules,
  inventoryTabs,
  accountingTabs,
}) => {
  const staticShortcuts = HOME_SHORTCUTS.filter((shortcut) => {
    if (!capabilities?.[shortcut.capability]) return false;
    if (!shortcut.moduleId) return true;
    return isModuleEnabled(modules, shortcut.moduleId);
  });

  const visibleSections = getNavSections({ inventoryTabs, accountingTabs })
    .map((section) => ({
      ...section,
      items: section.items.reduce((result, item) => {
        if (!isVisibleItem(item, capabilities, modules)) return result;
        if (!Array.isArray(item.children) || item.children.length === 0) {
          result.push(item);
          return result;
        }
        const visibleChildren = item.children.filter((child) => isVisibleItem(child, capabilities, modules));
        if (visibleChildren.length > 0) result.push({ ...item, children: visibleChildren });
        return result;
      }, []),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarShortcuts = visibleSections.flatMap((section) => section.items.flatMap((item) => {
    const parent = {
      id: `nav:${item.id || item.to}`,
      label: item.label,
      path: getItemPrimaryTarget(item),
      icon: item.icon || BookOpen,
    };

    if (!Array.isArray(item.children) || item.children.length === 0) return [parent];

    const children = item.children.map((child) => ({
      id: `nav-child:${item.id || item.to}:${child.to}:${child.tab || ''}`,
      label: `${item.label} • ${child.label}`,
      path: toNavTarget(child),
      icon: item.icon || BookOpen,
    }));

    return [parent, ...children];
  }));

  const merged = [...staticShortcuts.map((item) => ({ ...item, id: `legacy:${item.id}` })), ...sidebarShortcuts];
  const uniqueByLabel = new Map();
  merged.forEach((item) => {
    const key = `${item.label}::${typeof item.path === 'string' ? item.path : JSON.stringify(item.path)}`;
    if (!uniqueByLabel.has(key)) uniqueByLabel.set(key, item);
  });
  return Array.from(uniqueByLabel.values());
};

export const getDefaultShortcutIds = (availableShortcuts) => availableShortcuts.slice(0, 8).map((item) => item.id);

export const toVisibleShortcuts = (availableShortcuts, selectedShortcutIds) => {
  const mapById = new Map(availableShortcuts.map((item) => [item.id, item]));
  return selectedShortcutIds.map((id) => mapById.get(id)).filter(Boolean);
};
