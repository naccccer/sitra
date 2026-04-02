import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  ContactRound,
  Database,
  Factory,
  Package,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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

const FocusStat = ({ label, value, icon: Icon, accent = false }) => {
  const ResolvedIcon = Icon;

  return (
  <div
    className={[
      'rounded-[1.15rem] border p-3 shadow-[var(--shadow-soft)]',
      accent
        ? 'border-[rgb(186,198,228)]/90 bg-[linear-gradient(180deg,rgba(241,245,255,0.96),rgba(224,232,252,0.9))]'
        : 'border-white/70 bg-white/80',
    ].join(' ')}
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{label}</div>
        <div className="mt-1 text-lg font-black tracking-tight text-[rgb(var(--ui-text))]">{value}</div>
      </div>
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--ui-border-soft))] bg-white/78 text-[rgb(var(--ui-primary))]">
        <ResolvedIcon size={15} />
      </div>
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
  });
  const dateLabel = toPersianDate(now);
  const timeLabel = toPersianTime(now);

  return (
    <div className="space-y-4 pb-1">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card
          tone="inverse"
          padding="none"
          className="relative overflow-hidden xl:col-span-7"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,rgba(17,25,48,0.98),rgba(28,60,108,0.96)_42%,rgba(15,23,42,0.98))]" />
          <div className="absolute -left-16 top-6 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(120,169,255,0.28),transparent_70%)] blur-2xl" />
          <div className="absolute -bottom-16 right-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.18),transparent_72%)] blur-2xl" />
          <div className="relative flex h-full min-h-[14rem] flex-col justify-between p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/78 backdrop-blur">
                  <Sparkles size={12} />
                  خانه روزانه
                </div>
                <div className="max-w-lg text-2xl font-black leading-tight text-white lg:text-3xl">
                  مرکز فرمانِ امروز
                </div>
                <p className="max-w-xl text-sm font-medium leading-7 text-white/72">
                  میانبرها و وضعیت‌های مهم همین‌جا جمع شده‌اند تا بدون شلوغی، کارهای اصلی را سریع‌تر جلو ببرید.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-right text-[11px] font-bold text-white/70 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur md:block">
                <div>نمای روزانه</div>
                <div className="mt-1 text-white/90">بento layout</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
              {canSeeOrders ? (
                <>
                  <Button action="create" showActionIcon size="sm" onClick={() => navigate('/orders/new')} variant="accent">
                    سفارش جدید
                  </Button>
                  <Button action="openDetails" showActionIcon size="sm" onClick={() => navigate('/orders')} variant="secondary">
                    سفارشات
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Card>

        <Card
          tone="glass"
          padding="none"
          className="relative overflow-hidden xl:col-span-5"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,255,0.86))]" />
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(20,30,60,0.9),rgba(52,92,180,0.85),rgba(15,118,110,0.85))]" />
          <div className="relative flex h-full min-h-[14rem] flex-col justify-between p-5 lg:p-6">
            <div className="flex justify-end">
              <div
                dir="rtl"
                className="inline-flex items-center rounded-full border border-[rgb(226,231,243)] bg-white/88 px-3 py-2 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]"
                style={{ unicodeBidi: 'plaintext' }}
              >
                {dateLabel}
              </div>
            </div>
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[rgb(var(--ui-text-muted))]">زمان جاری</div>
              <div className="mt-2 text-4xl font-black tracking-tight text-[rgb(var(--ui-text))] lg:text-5xl" dir="ltr">
                {timeLabel}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[rgb(var(--ui-text-muted))]">
                <Clock3 size={15} />
                ساعت زنده
              </div>
            </div>
          </div>
        </Card>

        <Card
          tone="glass"
          padding="none"
          className="relative overflow-hidden xl:col-span-8"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,246,255,0.9))]" />
          <div className="absolute -right-12 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,113,255,0.16),transparent_72%)] blur-2xl" />
          <div className="relative p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[rgb(var(--ui-text-muted))]">دسترسی سریع</div>
              <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{visibleShortcuts.length} میانبر</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleShortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => navigate(shortcut.path)}
                  className="focus-ring group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/70 bg-white/86 px-3 text-xs font-black text-[rgb(var(--ui-text))] shadow-[var(--shadow-soft)] transition duration-[var(--motion-fast)] hover:-translate-y-px hover:shadow-[var(--shadow-surface)]"
                >
                  <shortcut.icon size={14} className="text-[rgb(var(--ui-text-muted))]" />
                  <span className="whitespace-nowrap">{shortcut.label}</span>
                  <ArrowUpRight size={12} className="text-[rgb(var(--ui-text-muted))] opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        {canSeeOrders ? (
          <Card
            tone="glass"
            padding="none"
            className="relative overflow-hidden xl:col-span-4"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,247,255,0.98),rgba(232,238,252,0.9))]" />
            <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.14),transparent_72%)] blur-2xl" />
            <div className="relative p-4 lg:p-5">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[rgb(var(--ui-text-muted))]">تمرکز امروز</div>
              <div className="grid grid-cols-1 gap-2">
                <FocusStat label="در انتظار" value={toPN(summary.pending)} icon={Clock3} accent />
                <FocusStat label="در حال انجام" value={toPN(summary.processing)} icon={Factory} />
                <FocusStat label="تحویل شده" value={toPN(summary.delivered)} icon={PackageCheck} accent />
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
