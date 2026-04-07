import React, { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Card, SegmentedTabs, WorkspaceShellTemplate } from '@/components/shared/ui'
import { isModuleEnabled } from '@/kernel/moduleRegistry'
import { MASTER_DATA_ROUTE_POLICIES } from '@/routes/routePolicies'

export const MasterDataPage = ({ session }) => {
  const location = useLocation()
  const navigate = useNavigate()

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

  const activeTabId = visibleRoutes.find((tab) => location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`))?.id || ''
  if (!activeTabId && defaultRoute) return <Navigate to={defaultRoute} replace />

  return (
    <WorkspaceShellTemplate
      showHeader={false}
      eyebrow="اطلاعات پایه"
      title="مدیریت تنظیمات مرجع"
      description="پیکربندی قیمت گذاری و پروفایل کسب و کار با الگوی تنظیمات استاندارد."
      actions={(
        <button
          type="button"
          onClick={() => navigate('/orders/new')}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowRight size={14} />
          بازگشت به ثبت سفارش
        </button>
      )}
      tabs={(
        <Card className="border-slate-200/90" padding="sm">
          <SegmentedTabs
            tabs={visibleRoutes.map((tab) => ({ id: tab.id, label: tab.label }))}
            activeId={activeTabId}
            onChange={(tabId) => {
              const nextTab = visibleRoutes.find((tab) => tab.id === tabId)
              if (nextTab?.to) navigate(nextTab.to)
            }}
          />
        </Card>
      )}
    >
      <Outlet />
    </WorkspaceShellTemplate>
  )
}
