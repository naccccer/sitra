import React, { useMemo } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessDenied } from '../../components/shared/AccessDenied'
import { isModuleEnabled } from '../moduleRegistry'

const SETTINGS_TABS = [
  { id: 'catalog', to: '/settings/catalog', label: 'مدیریت قیمت‌ها', capability: 'canManageCatalog', moduleId: 'master-data' },
  { id: 'profile', to: '/settings/profile', label: 'پروفایل کسب‌وکار', capability: 'canManageProfile', moduleId: 'master-data', showInTabs: false },
  { id: 'users', to: '/settings/users', label: 'مدیریت کاربران', capability: 'canManageUsers', moduleId: 'users-access' },
  { id: 'audit', to: '/settings/audit', label: 'ممیزی فعالیت‌ها', capability: 'canViewAuditLogs' },
]

const tabClassName = (isActive) => (
  `rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
    isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`
)

export const SettingsPage = ({ session }) => {
  const location = useLocation()

  const visibleRoutes = useMemo(() => {
    const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
    const modules = Array.isArray(session?.modules) ? session.modules : []

    return SETTINGS_TABS.filter((tab) => {
      if (tab.capability && !capabilities[tab.capability]) return false
      if (tab.moduleId && !isModuleEnabled(modules, tab.moduleId)) return false
      return true
    })
  }, [session])
  const visibleTabs = useMemo(() => visibleRoutes.filter((tab) => tab.showInTabs !== false), [visibleRoutes])

  if (visibleRoutes.length === 0) {
    return <AccessDenied message="دسترسی کافی برای بخش تنظیمات وجود ندارد" />
  }

  const defaultRoute = visibleTabs[0]?.to || visibleRoutes[0].to
  const isSettingsRoot = location.pathname === '/settings' || location.pathname === '/settings/'
  if (isSettingsRoot) {
    return <Navigate to={defaultRoute} replace />
  }

  const activeRoute = visibleRoutes.find((tab) => location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`))
  if (!activeRoute) {
    return <Navigate to={defaultRoute} replace />
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-black text-slate-900">تنظیمات</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1">پیکربندی سیستم و مدیریت اطلاعات پایه</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <NavLink key={tab.id} to={tab.to} className={({ isActive }) => tabClassName(isActive)}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  )
}
