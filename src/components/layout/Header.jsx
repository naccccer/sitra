import React, { useMemo } from 'react'
import { ArrowRight, Menu, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/shared/ui'
import { identityDisplayJobTitle, identityDisplayName } from '@/utils/userIdentity'

// UI copy anchor: خروج
const getPageTitle = (pathname) => {
  if (pathname === '/owner' || pathname.startsWith('/owner/')) return 'اتاق فرمان ERP'
  if (pathname === '/management' || pathname.startsWith('/management/')) return 'ممیزی فعالیت‌ها'
  if (pathname === '/master-data/pricing') return 'قیمت‌گذاری'
  if (pathname === '/master-data/profile') return 'پروفایل کسب‌وکار'
  if (pathname === '/master-data' || pathname.startsWith('/master-data/')) return 'اطلاعات پایه'
  if (pathname === '/') return 'داشبورد'
  if (pathname.startsWith('/orders/') && pathname !== '/orders/new') return 'ویرایش سفارش'
  if (pathname === '/orders') return 'مدیریت سفارشات'
  if (pathname === '/orders/new') return 'ثبت سفارش جدید'
  if (pathname === '/inventory') return 'مدیریت انبار'
  if (pathname === '/users-access' || pathname === '/users') return 'کاربران و دسترسی'
  return 'پنل مدیریت'
}

export const Header = ({ session, onToggleSidebar = () => {} }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname])
  const isCreateOrderPage = location.pathname === '/orders/new'
  const displayName = identityDisplayName(session)
  const displayJobTitle = identityDisplayJobTitle(session)

  return (
    <header className="print-hide sticky top-0 z-30 px-4 pt-4 lg:px-6 lg:pt-5">
      <div className="app-content-area">
        <div className="surface-card-glass flex items-center justify-between gap-3 rounded-[var(--radius-2xl)] border px-3 py-3 lg:px-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="focus-ring surface-icon-chip text-[rgb(var(--ui-text-muted))] transition-colors hover:text-[rgb(var(--ui-text))]"
              title="منو"
            >
              <Menu size={17} />
            </button>

            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--ui-accent))]">
                Workspace
              </div>
              <h1 className="truncate text-sm font-black text-[rgb(var(--ui-text))] lg:text-base">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCreateOrderPage ? (
              <Button onClick={() => navigate('/orders')} variant="secondary">
                <ArrowRight size={14} />
                بازگشت
              </Button>
            ) : null}

            <div
              title="اطلاعات کاربر جاری"
              className="surface-soft-inset flex items-center gap-2.5 rounded-[var(--radius-xl)] border-[rgba(var(--ui-primary),0.08)] px-3 py-2"
            >
              <div className="surface-icon-chip h-9 w-9 shrink-0 text-[rgb(var(--ui-primary))]">
                <User size={16} />
              </div>
              <div className="hidden leading-tight sm:block">
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
