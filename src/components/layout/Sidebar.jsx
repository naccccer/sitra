import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { isModuleEnabled } from '../../kernel/moduleRegistry'
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '../../utils/profile'

const navSections = [
  {
    id: 'daily',
    label: 'عملیات روزانه',
    items: [
      { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true, capability: 'canAccessDashboard', moduleId: 'sales' },
      { to: '/orders', label: 'سفارشات', icon: ClipboardList, capability: 'canManageOrders', moduleId: 'sales' },
    ],
  },
  {
    id: 'factory',
    label: 'عملیات کارخانه',
    items: [
      { to: '/production', label: 'تولید', icon: Factory, capability: 'canUseProduction', moduleId: 'production' },
      { to: '/inventory', label: 'انبار', icon: Boxes, capability: 'canUseInventory', moduleId: 'inventory' },
    ],
  },
  {
    id: 'system',
    label: 'مدیریت سیستم',
    items: [
      {
        to: '/owner',
        label: 'اتاق فرمان',
        icon: ShieldCheck,
        capability: 'canManageSystemSettings',
      },
      {
        to: '/settings',
        label: 'تنظیمات',
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
]

const navLinkClass = (isActive, isCollapsed) => `
  flex items-center rounded-xl border px-3 py-2 text-sm font-black transition-colors
  ${isCollapsed ? 'justify-center lg:px-2' : 'gap-2'}
  ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
`

export const Sidebar = ({ profile, session, isCollapsed = false, onToggleCollapse = () => {} }) => {
  const normalizedProfile = normalizeProfile(profile)
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath)
  const [failedLogoSrc, setFailedLogoSrc] = useState('')
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc
  const fallbackLetter = profileBrandInitial(normalizedProfile)
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const modules = Array.isArray(session?.modules) ? session.modules : []
  const isAdmin = String(session?.role || '').trim() === 'admin'

  const isVisibleItem = (item) => {
    if (typeof item.when === 'function' && !item.when(capabilities, modules)) return false
    if (item.to === '/owner' && isAdmin) return true
    if (item.capability && !capabilities[item.capability]) return false
    if (item.moduleId && !isModuleEnabled(modules, item.moduleId)) return false
    return true
  }

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isVisibleItem),
    }))
    .filter((section) => section.items.length > 0)

  const canCreateOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales')
  const canAccessBusinessProfile = Boolean(capabilities.canManageProfile) && isModuleEnabled(modules, 'master-data')

  return (
    <aside
      className={`print-hide border-b border-slate-200 bg-white px-4 py-4 transition-all lg:min-h-screen lg:border-b-0 lg:border-l ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      dir="rtl"
      style={{ fontFamily: 'Vazirmatn' }}
    >
      <div className={`relative mb-3 rounded-2xl bg-slate-900 text-white ${isCollapsed ? 'p-2' : 'px-3 py-3'}`}>
        {canAccessBusinessProfile && !isCollapsed && (
          <NavLink
            to="/settings/profile"
            title="پروفایل کسب‌وکار"
            className={({ isActive }) => `absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border text-white transition-colors ${
              isActive
                ? 'border-white/50 bg-white/20'
                : 'border-white/20 bg-white/10 hover:bg-white/20'
            }`}
          >
            <Settings size={14} />
          </NavLink>
        )}
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

      <nav className="space-y-4">
        {visibleSections.map((section) => (
          <div key={section.id} className="space-y-2">
            {!isCollapsed && <div className="px-1 text-[10px] font-black text-slate-400">{section.label}</div>}
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon
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
                )
              })}
            </div>
          </div>
        ))}
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
  )
}
