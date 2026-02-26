import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  PlusCircle,
  Settings,
  Users,
} from 'lucide-react';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '../../utils/profile';

const navItems = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true, capability: 'canAccessDashboard' },
  { to: '/orders', label: 'سفارشات', icon: ClipboardList, capability: 'canManageOrders' },
  { to: '/inventory', label: 'انبار', icon: Boxes, capability: 'canUseInventory' },
  { to: '/production', label: 'تولید', icon: Factory, capability: 'canUseProduction' },
  { to: '/admin', label: 'مدیریت قیمت‌ها', icon: Settings, capability: 'canManageCatalog' },
  { to: '/profile', label: 'پروفایل کسب‌وکار', icon: BadgeCheck, capability: 'canManageProfile' },
  { to: '/users', label: 'مدیریت کاربران', icon: Users, capability: 'canManageUsers' },
];

const navLinkClass = (isActive, isCollapsed) => `
  flex items-center rounded-xl border px-3 py-2 text-sm font-black transition-colors
  ${isCollapsed ? 'justify-center lg:px-2' : 'gap-2'}
  ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
`;

export const Sidebar = ({ profile, session, isCollapsed = false, onToggleCollapse = () => {} }) => {
  const normalizedProfile = normalizeProfile(profile);
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath);
  const [failedLogoSrc, setFailedLogoSrc] = useState('');
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc;
  const fallbackLetter = profileBrandInitial(normalizedProfile);
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {};

  const visibleNavItems = navItems.filter((item) => {
    if (!item.capability) return true;
    return Boolean(capabilities[item.capability]);
  });

  const canCreateOrders = Boolean(capabilities.canManageOrders);

  return (
    <aside
      className={`print-hide border-b border-slate-200 bg-white px-4 py-4 transition-all lg:min-h-screen lg:border-b-0 lg:border-l ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
    >
      <div className={`mb-3 rounded-2xl bg-slate-900 text-white ${isCollapsed ? 'p-2' : 'px-3 py-3'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
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
          {!isCollapsed && (
            <div className="leading-tight">
              <div className="text-sm font-black">{normalizedProfile.brandName}</div>
              <div className="text-[10px] text-slate-300">{normalizedProfile.panelSubtitle}</div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggleCollapse}
        className={`mb-3 hidden h-9 items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 lg:flex ${isCollapsed ? 'justify-center px-2' : 'w-full justify-between px-3'}`}
        title={isCollapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
        type="button"
      >
        {isCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        {!isCollapsed && <span className="text-xs font-black">جمع کردن منو</span>}
      </button>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
              title={item.label}
            >
              <Icon size={16} />
              <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {canCreateOrders && (
        <NavLink
          to="/orders/new"
          title="ثبت سفارش جدید"
          className={`mt-3 flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-500 ${isCollapsed ? 'justify-center lg:px-2' : 'justify-center gap-1'}`}
        >
          <PlusCircle size={14} />
          <span className={isCollapsed ? 'lg:hidden' : ''}>ثبت سفارش جدید</span>
        </NavLink>
      )}
    </aside>
  );
};
