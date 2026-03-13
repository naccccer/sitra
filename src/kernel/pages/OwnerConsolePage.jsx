import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Badge, Card } from '@/components/shared/ui';

const OWNER_TABS = [
  { id: 'modules', to: '/owner/modules', label: 'کنترل ماژول‌ها' },
  { id: 'users', to: '/owner/users', label: 'کاربران و دسترسی‌ها' },
];

const tabClassName = (isActive) => (
  `focus-ring rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
    isActive ? 'border-amber-500 bg-amber-500 text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
  }`
);

export const OwnerConsolePage = () => (
  <div className="mx-auto max-w-[1300px] space-y-4" dir="rtl">
    <Card className="border-amber-400/60 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white" padding="lg">
      <h2 className="text-sm font-black text-amber-300">اتاق فرمان ERP</h2>
      <div className="mt-2">
        <Badge className="bg-white/15 text-white">فقط برای دسترسی سطح مالک</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {OWNER_TABS.map((tab) => (
          <NavLink key={tab.id} to={tab.to} className={({ isActive }) => tabClassName(isActive)}>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </Card>

    <Outlet />
  </div>
);
