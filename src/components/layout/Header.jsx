import React, { useMemo } from 'react'
import { ArrowRight, CircleAlert, Menu, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, IconButton, Tooltip } from '@/components/shared/ui'
import { getShellPageMeta } from '@/components/layout/shellMeta'
import { identityDisplayJobTitle, identityDisplayName } from '@/utils/userIdentity'

// UI copy anchors: داشبورد | اطلاعات پایه | خروج
export const Header = ({
  session,
  onToggleSidebar = () => {},
  isSidebarCollapsed = false,
  isSidebarOpen = false,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  const pageMeta = useMemo(() => getShellPageMeta(location.pathname), [location.pathname])
  const isCreateOrderPage = location.pathname === '/orders/new'
  const displayName = identityDisplayName(session)
  const displayJobTitle = identityDisplayJobTitle(session)
  const menuTooltip = isSidebarOpen ? 'بستن نوار کناری' : isSidebarCollapsed ? 'گسترش نوار کناری' : 'جمع کردن نوار کناری'

  return (
    <header className="app-shell-header print-hide sticky top-0 pb-4">
      <div className="app-shell-content">
        <div className="page-header-shell p-4 lg:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex items-center gap-3">
              <IconButton
                onClick={onToggleSidebar}
                variant="tertiary"
                label={menuTooltip}
                tooltip={menuTooltip}
                tooltipSide="bottom-right"
                className="shrink-0"
              >
                <Menu size={17} />
              </IconButton>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="page-header-title truncate leading-none">{pageMeta.title}</h1>
                  {pageMeta.description ? (
                    <Tooltip content={pageMeta.description} side="bottom-right">
                      <span
                        tabIndex={0}
                        role="img"
                        aria-label="توضیحات"
                        className="focus-ring inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[rgb(var(--ui-text-muted))]"
                      >
                        <CircleAlert size={14} />
                      </span>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {isCreateOrderPage ? (
                <Button onClick={() => navigate('/orders')} variant="tertiary" size="sm">
                  <ArrowRight size={14} />
                  بازگشت به میزکار سفارشات
                </Button>
              ) : null}

              <div className="shell-user-chip hidden items-center gap-2 rounded-[var(--radius-2xl)] px-3 py-2 sm:flex">
                <div className="shell-user-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white">
                  <User size={16} />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-black text-[rgb(var(--ui-text))]">{displayName}</div>
                  <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{displayJobTitle}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
