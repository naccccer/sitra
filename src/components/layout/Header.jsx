import React, { useMemo } from 'react';
import { ArrowRight, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const getPageTitle = (pathname) => {
  if (pathname === '/') return 'داشبورد';
  if (pathname.startsWith('/orders/') && pathname !== '/orders/new') return 'ویرایش سفارش';
  if (pathname === '/orders') return 'مدیریت سفارشات';
  if (pathname === '/orders/new') return 'ثبت سفارش جدید';
  if (pathname === '/inventory') return 'مدیریت انبار';
  if (pathname === '/production') return 'برنامه تولید';
  if (pathname === '/admin') return 'مدیریت قیمت‌ها';
  if (pathname === '/profile') return 'پروفایل کسب‌وکار';
  if (pathname === '/users') return 'مدیریت کاربران';
  return 'پنل مدیریت';
};

export const Header = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const isCreateOrderPage = location.pathname === '/orders/new';

  return (
    <header className="print-hide sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
      <div className="mx-auto flex max-w-[1300px] items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-black text-slate-800 lg:text-base">{title}</h1>
          <p className="text-[10px] font-bold text-slate-500">مدیریت یکپارچه سفارشات و عملیات</p>
        </div>

        <div className="flex items-center gap-2">
          {isCreateOrderPage && (
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100"
              type="button"
            >
              <ArrowRight size={14} />
              بازگشت
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-100"
            type="button"
          >
            <LogOut size={14} />
            خروج
          </button>
        </div>
      </div>
    </header>
  );
};
