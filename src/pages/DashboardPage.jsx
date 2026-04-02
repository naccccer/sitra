import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock3,
  ContactRound,
  Database,
  Factory,
  Package,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { Button, Card } from '@/components/shared/ui';
import { isModuleEnabled } from '@/kernel/moduleRegistry';
import { toPN } from '@/utils/helpers';

const toPersianDate = (date) => {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return [lookup.weekday, lookup.day, lookup.month, lookup.year].filter(Boolean).join(' ');
};

const toPersianTime = (date) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(date);

const HOME_SHORTCUTS = [
  { id: 'orders', label: 'سفارشات', path: '/orders', icon: BookOpen, capability: 'canManageOrders', moduleId: 'sales' },
  { id: 'customers', label: 'مشتریان', path: '/customers', icon: ContactRound, capability: 'canManageCustomers', moduleId: 'customers' },
  { id: 'inventory', label: 'انبار', path: '/inventory', icon: Package, capability: 'canAccessInventory', moduleId: 'inventory' },
  { id: 'accounting', label: 'حسابداری', path: '/accounting', icon: Database, capability: 'canAccessAccounting', moduleId: 'accounting' },
  { id: 'human-resources', label: 'منابع انسانی', path: '/human-resources', icon: UsersRound, capability: 'canAccessHumanResources', moduleId: 'human-resources' },
  { id: 'users-access', label: 'کاربران', path: '/users-access', icon: ShieldCheck, capability: 'canManageUsers', moduleId: 'users-access' },
  { id: 'security-access', label: 'امنیت و دسترسی', path: '/management/audit', icon: SlidersHorizontal, capability: 'canViewAuditLogs' },
  { id: 'master-data', label: 'اطلاعات پایه', path: '/master-data', icon: Database, capability: 'canManageProfile', moduleId: 'master-data' },
];

const StatPill = ({ label, value, icon }) => {
  const Icon = icon;

  return (
    <div className="inline-flex min-w-[6.25rem] items-center gap-2 rounded-full bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--ui-surface-muted))] text-[rgb(var(--ui-primary))]">
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold leading-none text-[rgb(var(--ui-text-muted))]">{label}</div>
        <div className="mt-0.5 text-sm font-black leading-none text-[rgb(var(--ui-text))]">{value}</div>
      </div>
    </div>
  );
};

export const DashboardPage = ({ orders = [], session = {} }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {};
  const modules = Array.isArray(session?.modules) ? session.modules : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const active = (Array.isArray(orders) ? orders : []).filter((order) => order.status !== 'archived');
    return {
      pending: active.filter((order) => order.status === 'pending').length,
      processing: active.filter((order) => order.status === 'processing').length,
      delivered: active.filter((order) => order.status === 'delivered').length,
    };
  }, [orders]);

  const canSeeOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales');
  const visibleShortcuts = HOME_SHORTCUTS.filter((shortcut) => {
    if (!capabilities?.[shortcut.capability]) return false;
    if (!shortcut.moduleId) return true;
    return isModuleEnabled(modules, shortcut.moduleId);
  }).slice(0, 8);

  return (
    <div className="space-y-4 pb-1">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card
          tone="glass"
          padding="none"
          className="relative overflow-hidden xl:col-span-7"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,239,241,0.9))]" />
          <div className="relative flex min-h-[11rem] flex-col items-end justify-center gap-4 p-5 text-right lg:p-6">
            <div className="flex w-full flex-col items-end gap-3">
              <div className="text-right" dir="ltr">
                <div className="text-4xl font-black tracking-tight text-[rgb(var(--ui-text))] lg:text-5xl">
                  {toPersianTime(now)}
                </div>
              </div>
              <div
                dir="rtl"
                className="inline-flex max-w-full items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-[rgb(var(--ui-text-muted))] shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                style={{ unicodeBidi: 'plaintext' }}
              >
                {toPersianDate(now)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          tone="glass"
          padding="none"
          className="relative overflow-hidden xl:col-span-5"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,243,245,0.96),rgba(236,236,239,0.92))]" />
          <div className="relative space-y-3 p-5 lg:p-6">
            {canSeeOrders ? (
              <div className="flex justify-start">
                <Button action="create" showActionIcon size="sm" onClick={() => navigate('/orders/new')}>
                  ثبت سفارش جدید
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {visibleShortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => navigate(shortcut.path)}
                  className="focus-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-[rgb(var(--ui-text))] shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition duration-[var(--motion-fast)] hover:-translate-y-px hover:bg-white hover:shadow-[0_18px_34px_rgba(15,23,42,0.14)]"
                >
                  <shortcut.icon size={13} className="text-[rgb(var(--ui-text-muted))]" />
                  <span className="whitespace-nowrap">{shortcut.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {canSeeOrders ? (
          <Card
            tone="glass"
            padding="none"
            className="relative overflow-hidden xl:col-span-12"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,246,247,0.9))]" />
            <div className="relative p-4 lg:p-5">
              <div className="flex flex-wrap gap-2">
                <StatPill label="در انتظار" value={toPN(summary.pending)} icon={Clock3} />
                <StatPill label="در حال انجام" value={toPN(summary.processing)} icon={Factory} />
                <StatPill label="تحویل شده" value={toPN(summary.delivered)} icon={PackageCheck} />
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
