import React, { useMemo } from 'react';
import { ArrowRight, Menu, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared/ui';
import { identityDisplayJobTitle, identityDisplayName } from '@/utils/userIdentity';

const getPageTitle = (pathname) => {
  // تنظیمات
  if (pathname === '/owner' || pathname.startsWith('/owner/')) return 'اتاق فرمان ERP';
  if (pathname === '/management' || pathname.startsWith('/management/')) return 'مدیریت';
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'مدیریت';
  if (pathname === '/') return 'داشبورد';
  if (pathname.startsWith('/orders/') && pathname !== '/orders/new') return 'ویرایش سفارش';
  if (pathname === '/orders') return 'مدیریت سفارشات';
  if (pathname === '/orders/new') return 'ثبت سفارش جدید';
  if (pathname === '/admin') return 'مدیریت قیمت‌ها';
  if (pathname === '/profile') return 'پروفایل کسب‌وکار';
  if (pathname === '/users') return 'مدیریت کاربران';
  if (pathname === '/system-settings') return 'مدیریت سیستم';
  return 'پنل مدیریت';
};

export const Header = ({ session, onToggleSidebar = () => {} }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const isCreateOrderPage = location.pathname === '/orders/new';
  const displayName = identityDisplayName(session);
  const displayJobTitle = identityDisplayJobTitle(session);

  return (
    <header className="print-hide sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 px-4 py-4 backdrop-blur-lg lg:px-6">
      <div className="app-content-area flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            title="منو"
          >
            <Menu size={17} />
          </button>
          <h1 className="text-sm font-black text-slate-900 lg:text-base">{title}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {isCreateOrderPage && (
            <Button onClick={() => navigate('/orders')} variant="secondary">
              <ArrowRight size={14} />
              بازگشت
            </Button>
          )}
          <div title="خروج در نوار کناری" className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
              <User size={16} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-black text-slate-800">{displayName}</div>
              <div className="text-[11px] font-bold text-slate-500">{displayJobTitle}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
