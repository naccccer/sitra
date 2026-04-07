import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock3,
  ContactRound,
  Database,
  Package,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { Button, Card, WorkspaceShellTemplate } from '@/components/shared/ui';
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

const SummaryChip = ({ label, value, icon }) => {
  const Icon = icon;

  return (
    <div className="workspace-summary-chip">
      <span className="workspace-summary-chip__icon">
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold leading-none text-[rgb(var(--ui-text-muted))]">{label}</div>
        <div className="mt-0.5 text-sm font-black leading-none text-[rgb(var(--ui-text))]">{value}</div>
      </div>
    </div>
  );
};

const ShortcutCard = ({ icon, label, path, onNavigate }) => {
  const ShortcutIcon = icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      className="surface-button-card focus-ring flex w-full items-center justify-between gap-3 p-4 text-right"
    >
      <div className="min-w-0">
        <div className="text-sm font-black text-[rgb(var(--ui-text))]">{label}</div>
        <div className="mt-1 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">ورود سریع به میزکار</div>
      </div>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]">
        <ShortcutIcon size={16} />
      </span>
    </button>
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
  const activeOrders = summary.pending + summary.processing;

  return (
    <WorkspaceShellTemplate
      eyebrow="خانه"
      title="دید کلی عملیات روزانه"
      description="پرتکرارترین مسیرهای کاری، وضعیت سفارش ها و شروع سریع عملیات اصلی را از همین سطح دنبال کنید."
      summary={(
        <>
          <SummaryChip label="ساعت" value={toPersianTime(now)} icon={Clock3} />
          <SummaryChip label="در جریان" value={toPN(activeOrders)} icon={BookOpen} />
          <SummaryChip label="تحویل شده" value={toPN(summary.delivered)} icon={PackageCheck} />
        </>
      )}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card tone="glass" padding="none" className="relative overflow-hidden xl:col-span-8">
          <div className="relative flex min-h-[13rem] flex-col gap-5 p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="text-right" dir="ltr">
                  <div className="text-4xl font-black tracking-tight text-[rgb(var(--ui-text))] lg:text-5xl">
                    {toPersianTime(now)}
                  </div>
                </div>
                <div
                  dir="rtl"
                  className="inline-flex max-w-full items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-[rgb(var(--ui-text-muted))] shadow-[var(--shadow-soft)]"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {toPersianDate(now)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canSeeOrders ? (
                  <Button action="create" showActionIcon size="sm" onClick={() => navigate('/orders/new')}>
                    ثبت سفارش جدید
                  </Button>
                ) : null}
                <Button variant="tertiary" size="sm" onClick={() => navigate('/orders')}>
                  مشاهده سفارشات
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visibleShortcuts.map((shortcut) => (
                <ShortcutCard key={shortcut.id} icon={shortcut.icon} label={shortcut.label} path={shortcut.path} onNavigate={navigate} />
              ))}
            </div>
          </div>
        </Card>

        <Card tone="muted" padding="none" className="xl:col-span-4">
          <div className="space-y-4 p-5 lg:p-6">
            <div>
              <div className="page-header-kicker">تمرکز امروز</div>
              <h2 className="mt-1 text-lg font-black text-[rgb(var(--ui-text))]">وضعیت قابل مشاهده سفارش ها</h2>
              <p className="mt-2 text-xs font-bold leading-6 text-[rgb(var(--ui-text-muted))]">
                این بخش برای شروع روز کاری، تصویر سریع از سفارش های فعال را بدون ورود به جزئیات نشان می دهد.
              </p>
            </div>

            <div className="grid gap-3">
              <Card tone="default" className="border-none" padding="md">
                <div className="text-[11px] font-black text-[rgb(var(--ui-text-muted))]">در انتظار</div>
                <div className="mt-2 text-2xl font-black text-[rgb(var(--ui-text))]">{toPN(summary.pending)}</div>
              </Card>
              <Card tone="default" className="border-none" padding="md">
                <div className="text-[11px] font-black text-[rgb(var(--ui-text-muted))]">در حال انجام</div>
                <div className="mt-2 text-2xl font-black text-[rgb(var(--ui-text))]">{toPN(summary.processing)}</div>
              </Card>
              <Card tone="accent" className="border-none" padding="md">
                <div className="text-[11px] font-black text-[rgb(var(--ui-accent-strong))]">تحویل شده</div>
                <div className="mt-2 text-2xl font-black text-[rgb(var(--ui-accent-strong))]">{toPN(summary.delivered)}</div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </WorkspaceShellTemplate>
  );
};
