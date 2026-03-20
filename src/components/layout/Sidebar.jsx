import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { isModuleEnabled } from '@/kernel/moduleRegistry';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile';

// تنظیمات
const navSections = [
  {
    id: 'daily',
    label: 'عملیات روزانه',
    items: [
      { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true, capability: 'canAccessDashboard', moduleId: 'sales' },
      { to: '/orders', label: 'سفارشات', icon: ClipboardList, capability: 'canManageOrders', moduleId: 'sales' },
      { to: '/customers', label: 'مشتریان', icon: Users, capability: 'canManageCustomers', moduleId: 'customers' },
      { to: '/human-resources', label: 'منابع انسانی', icon: Users, capability: 'canAccessHumanResources', moduleId: 'human-resources' },
      { to: '/inventory', label: 'انبار', icon: Package, capability: 'canAccessInventory', moduleId: 'inventory' },
      { to: '/accounting', label: 'حسابداری', icon: BookOpen, capability: 'canAccessAccounting', moduleId: 'accounting' },
    ],
  },
  {
    id: 'system',
    label: 'مدیریت سیستم',
    items: [
      { to: '/owner', label: 'اتاق فرمان', icon: ShieldCheck, capability: 'canManageSystemSettings' },
      {
        to: '/management',
        label: 'مدیریت',
        icon: SlidersHorizontal,
        when: (capabilities) => Boolean(
          capabilities.canManageCatalog
          || capabilities.canManageProfile
          || capabilities.canManageUsers
          || capabilities.canViewAuditLogs,
        ),
      },
    ],
  },
];

const navLinkClass = (isActive, isCollapsed) => `
  focus-ring flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black transition-colors
  ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
  ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}
`;

export const Sidebar = ({
  profile,
  session,
  onLogout = () => {},
  isCollapsed = false,
  isOpen = false,
  onCloseMobile = () => {},
  onNavigate = () => {},
}) => {
  const normalizedProfile = normalizeProfile(profile);
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath);
  const [failedLogoSrc, setFailedLogoSrc] = useState('');
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc;
  const fallbackLetter = profileBrandInitial(normalizedProfile);
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {};
  const modules = Array.isArray(session?.modules) ? session.modules : [];

  const isVisibleItem = (item) => {
    if (typeof item.when === 'function' && !item.when(capabilities, modules)) return false;
    if (item.capability && !capabilities[item.capability]) return false;
    if (item.moduleId && !isModuleEnabled(modules, item.moduleId)) return false;
    return true;
  };

  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter(isVisibleItem) }))
    .filter((section) => section.items.length > 0);

  const canCreateOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales');
  const canAccessBusinessProfile = Boolean(capabilities.canManageProfile) && isModuleEnabled(modules, 'master-data');
  const canAccessSettings = Boolean(
    capabilities.canManageCatalog
    || capabilities.canManageProfile
    || capabilities.canManageUsers
    || capabilities.canViewAuditLogs
    || capabilities.canManageSystemSettings,
  );
  const settingsTarget = canAccessBusinessProfile ? '/profile' : '/management';

  return (
    <aside
      className={`print-hide fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-l border-slate-200/90 bg-white/95 px-4 py-4 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      dir="rtl"
    >
      <button
        type="button"
        onClick={onCloseMobile}
        title="بستن منو"
        className="focus-ring mb-2 inline-flex h-9 w-9 items-center justify-center self-end rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
      >
        <X size={16} />
      </button>

      <div className={`mb-4 rounded-2xl bg-slate-900 text-white shadow-md ${isCollapsed ? 'p-2 lg:p-2' : 'px-3 py-3'}`}>
        <div className={`flex items-center ${isCollapsed ? 'gap-2 lg:justify-center' : 'gap-2'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 text-base font-black shadow-inner">
            {showLogo ? (
              <img
                src={logoSrc}
                alt={normalizedProfile.brandName}
                onError={() => setFailedLogoSrc(logoSrc)}
                className="h-full w-full object-cover"
              />
            ) : (
              fallbackLetter
            )}
          </div>
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <div className="text-sm font-black">{normalizedProfile.brandName}</div>
            <div className="text-[10px] text-slate-300">{normalizedProfile.panelSubtitle}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pe-1">
        <nav className="space-y-4">
        {visibleSections.map((section) => (
          <div key={section.id} className="space-y-2">
            <div className={`px-1 text-[10px] font-black text-slate-400 ${isCollapsed ? 'lg:hidden' : ''}`}>{section.label}</div>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={Boolean(item.end)}
                    onClick={onNavigate}
                    className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
                    title={item.label}
                  >
                    <Icon size={16} />
                    <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
        </nav>

        <div className="mt-3">
        {canCreateOrders && (
          <NavLink
            to="/orders/new"
            onClick={onNavigate}
            title="ثبت سفارش جدید"
            className={`focus-ring flex items-center rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-500 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-center gap-1'}`}
          >
            <PlusCircle size={14} />
            <span className={isCollapsed ? 'lg:hidden' : ''}>ثبت سفارش جدید</span>
          </NavLink>
        )}
      </div>

      </div>

      <div className="mt-auto space-y-2 border-t border-slate-200 pt-3">
        {canAccessSettings && (
          <NavLink
            to={settingsTarget}
            onClick={onNavigate}
            className={({ isActive }) => `focus-ring flex items-center rounded-xl border px-3 py-2 text-xs font-black transition-colors ${isCollapsed ? 'lg:justify-center lg:px-2' : 'gap-1.5'} ${isActive ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            title="تنظیمات"
          >
            <Settings size={14} />
            <span className={isCollapsed ? 'lg:hidden' : ''}>تنظیمات</span>
          </NavLink>
        )}
        <button
          type="button"
          onClick={onLogout}
          className={`focus-ring flex w-full items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition-colors hover:bg-rose-100 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'gap-1.5'}`}
          title="خروج"
        >
          <LogOut size={14} />
          <span className={isCollapsed ? 'lg:hidden' : ''}>خروج</span>
        </button>
      </div>
    </aside>
  );
};

