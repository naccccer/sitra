import React, { useMemo } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Card } from '@/components/shared/ui'
import { isModuleEnabled } from '@/kernel/moduleRegistry'
import { MASTER_DATA_ROUTE_POLICIES } from '@/routes/routePolicies'

const tabClassName = (isActive) => (
  `focus-ring rounded-2xl border px-4 py-2.5 text-xs font-black transition-all ${
    isActive
      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
      : 'border-slate-200/90 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white'
  }`
)

export const MasterDataPage = ({ session }) => {
  const location = useLocation()

  const visibleRoutes = useMemo(() => {
    const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
    const modules = Array.isArray(session?.modules) ? session.modules : []

    return MASTER_DATA_ROUTE_POLICIES.map((policy) => ({
      ...policy,
      id: policy.path,
      to: `/master-data/${policy.path}`,
    })).filter((tab) => {
      if (tab.capability && !capabilities[tab.capability]) return false
      if (tab.moduleId && !isModuleEnabled(modules, tab.moduleId)) return false
      return true
    })
  }, [session])

  if (visibleRoutes.length === 0) {
    return <AccessDenied message="دسترسی کافی برای بخش اطلاعات پایه وجود ندارد" />
  }

  const defaultRoute = visibleRoutes[0]?.to
  const isMasterDataRoot = location.pathname === '/master-data' || location.pathname === '/master-data/'
  if (isMasterDataRoot && defaultRoute) return <Navigate to={defaultRoute} replace />

  const hasVisibleMatch = visibleRoutes.some((tab) => location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`))
  if (!hasVisibleMatch && defaultRoute) return <Navigate to={defaultRoute} replace />

  return (
    <div className="mx-auto max-w-[1300px] space-y-4" dir="rtl">
      <h1 className="sr-only">اطلاعات پایه</h1>
      <Card className="border-slate-200/90" padding="sm">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex min-w-max items-center gap-2">
            {visibleRoutes.map((tab) => (
              <NavLink key={tab.id} to={tab.to} className={({ isActive }) => tabClassName(isActive)}>
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>
      </Card>

      <Outlet />
    </div>
  )
}
