import React, { useMemo } from 'react'
import { ArrowRight, Menu, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, IconButton } from '@/components/shared/ui'
import { identityDisplayJobTitle, identityDisplayName } from '@/utils/userIdentity'

// UI copy anchors: داشبورد | خروج
const getPageMeta = (pathname) => {
  if (pathname === '/owner' || pathname.startsWith('/owner/')) return { section: 'پیکربندی پیشرفته', title: 'اتاق فرمان ERP' }
  if (pathname === '/management' || pathname.startsWith('/management/')) return { section: 'امنیت و دسترسی', title: 'ممیزی فعالیت ها' }
  if (pathname === '/master-data/pricing') return { section: 'اطلاعات پایه', title: 'قیمت گذاری' }
  if (pathname === '/master-data/profile') return { section: 'اطلاعات پایه', title: 'پروفایل کسب و کار' }
  if (pathname === '/master-data' || pathname.startsWith('/master-data/')) return { section: 'پیکربندی', title: 'اطلاعات پایه' }
  if (pathname === '/') return { section: 'عملیات روزانه', title: 'خانه' }
  if (pathname.startsWith('/orders/') && pathname !== '/orders/new') return { section: 'عملیات روزانه', title: 'ویرایش سفارش' }
  if (pathname === '/orders') return { section: 'عملیات روزانه', title: 'مدیریت سفارشات' }
  if (pathname === '/orders/new') return { section: 'عملیات روزانه', title: 'ثبت سفارش جدید' }
  if (pathname === '/inventory') return { section: 'عملیات روزانه', title: 'مدیریت انبار' }
  if (pathname === '/users-access' || pathname === '/users') return { section: 'امنیت و دسترسی', title: 'کاربران و دسترسی' }
  return { section: 'پنل مدیریت', title: 'پنل مدیریت' }
}

export const Header = ({
  session,
  onToggleSidebar = () => {},
  isSidebarCollapsed = false,
  isSidebarOpen = false,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname])
  const isCreateOrderPage = location.pathname === '/orders/new'
  const displayName = identityDisplayName(session)
  const displayJobTitle = identityDisplayJobTitle(session)
  const menuTooltip = isSidebarOpen ? 'بستن منوی کناری' : isSidebarCollapsed ? 'گسترش نوار کناری' : 'تغییر حالت ناوبری'

  return (
    <header className="app-shell-header print-hide sticky top-0 px-4 pb-4 pt-0 lg:px-6">
      <div className="app-shell-content">
        <div className="page-header-shell flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <IconButton
              onClick={onToggleSidebar}
              variant="secondary"
              label={menuTooltip}
              tooltip={menuTooltip}
              tooltipSide="bottom"
              className="shrink-0"
            >
              <Menu size={17} />
            </IconButton>

            <h1 className="truncate text-sm font-black text-[rgb(var(--ui-text))] lg:text-base">{pageMeta.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isCreateOrderPage && (
              <Button onClick={() => navigate('/orders')} variant="secondary" size="sm">
                <ArrowRight size={14} />
                بازگشت
              </Button>
            )}

            <div className="shell-user-chip hidden items-center gap-2 rounded-[var(--radius-xl)] px-3 py-2 sm:flex">
              <div className="shell-user-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700">
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
    </header>
  )
}
