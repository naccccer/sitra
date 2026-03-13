import React, { useMemo } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card } from '@/components/shared/ui';
import { isModuleEnabled } from '@/kernel/moduleRegistry';

// تنظیمات
const SETTINGS_TABS = [
  { id: 'catalog', to: '/management/catalog', label: 'قیمت‌ها', capability: 'canManageCatalog', moduleId: 'master-data' },
  { id: 'users', to: '/management/users', label: 'کاربران', capability: 'canManageUsers', moduleId: 'users-access' },
  { id: 'audit', to: '/management/audit', label: 'فعالیت‌ها', capability: 'canViewAuditLogs' },
];

const tabClassName = (isActive) => (
  `focus-ring rounded-2xl border px-4 py-2.5 text-xs font-black transition-all ${
    isActive
      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
      : 'border-slate-200/90 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white'
  }`
);

export const SettingsPage = ({ session }) => {
  const location = useLocation();

  const visibleRoutes = useMemo(() => {
    const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {};
    const modules = Array.isArray(session?.modules) ? session.modules : [];

    return SETTINGS_TABS.filter((tab) => {
      if (tab.capability && !capabilities[tab.capability]) return false;
      if (tab.moduleId && !isModuleEnabled(modules, tab.moduleId)) return false;
      return true;
    });
  }, [session]);
  const visibleTabs = useMemo(() => visibleRoutes.filter((tab) => tab.showInTabs !== false), [visibleRoutes]);

  if (visibleRoutes.length === 0) {
    return <AccessDenied message="دسترسی کافی برای بخش مدیریت وجود ندارد" />;
  }

  const defaultRoute = visibleTabs[0]?.to || visibleRoutes[0].to;
  const isSettingsRoot = location.pathname === '/management' || location.pathname === '/management/';
  if (isSettingsRoot) return <Navigate to={defaultRoute} replace />;

  const hasVisibleMatch = visibleRoutes.some((tab) => location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`));
  if (!hasVisibleMatch) return <Navigate to={defaultRoute} replace />;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4" dir="rtl">
      <Card className="border-slate-200/90" padding="sm">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex min-w-max items-center gap-2">
            {visibleTabs.map((tab) => (
              <NavLink key={tab.id} to={tab.to} className={({ isActive }) => tabClassName(isActive)}>
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>
      </Card>

      <Outlet />
    </div>
  );
};
