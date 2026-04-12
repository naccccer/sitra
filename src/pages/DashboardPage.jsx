import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Clock3, PackageCheck, Settings2 } from 'lucide-react';
import { Button, Card, IconButton, ModalShell, WorkspaceShellTemplate } from '@/components/shared/ui';
import { getSidebarShortcutItems } from '@/components/layout/sidebarNav';
import { isModuleEnabled } from '@/kernel/moduleRegistry';
import { getVisibleAccountingTabs } from '@/modules/accounting/navigation';
import { useTabSettings } from '@/modules/accounting/hooks/useTabSettings';
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation';
import { toPN } from '@/utils/helpers';

const DASHBOARD_SHORTCUTS_KEY = 'dashboard.quick-shortcuts.v1';

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

const readStoredShortcutIds = (storageKey) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

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

const ShortcutCard = ({ icon, label, target, onNavigate }) => {
  const ShortcutIcon = icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onNavigate(target)}
      className="surface-button-card focus-ring flex w-full items-center justify-between gap-3 p-4 text-right"
    >
      <div className="min-w-0 text-sm font-black text-[rgb(var(--ui-text))]">{label}</div>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]">
        <ShortcutIcon size={16} />
      </span>
    </button>
  );
};

export const DashboardPage = ({ orders = [], session = {} }) => {
  const navigate = useNavigate();
  const { isVisible } = useTabSettings();
  const [now, setNow] = useState(() => new Date());
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const capabilities = useMemo(
    () => (session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}),
    [session?.capabilities],
  );
  const modules = useMemo(() => (Array.isArray(session?.modules) ? session.modules : []), [session?.modules]);
  const permissions = useMemo(() => (Array.isArray(session?.permissions) ? session.permissions : []), [session?.permissions]);
  const storageKey = `${DASHBOARD_SHORTCUTS_KEY}:${session?.username || 'anonymous'}`;

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

  const availableShortcuts = useMemo(() => (
    getSidebarShortcutItems({
      inventoryTabs: getVisibleInventoryTabs(permissions),
      accountingTabs: getVisibleAccountingTabs(permissions, isVisible),
      capabilities,
      modules,
    }).filter((item) => item.target !== '/')
  ), [capabilities, isVisible, modules, permissions]);

  const [selectedShortcutIds, setSelectedShortcutIds] = useState(() => readStoredShortcutIds(storageKey));
  const [draftShortcutIds, setDraftShortcutIds] = useState([]);

  useEffect(() => {
    setSelectedShortcutIds(readStoredShortcutIds(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const visibleIds = new Set(availableShortcuts.map((item) => item.id));
    setSelectedShortcutIds((previous) => previous.filter((id) => visibleIds.has(id)));
  }, [availableShortcuts]);

  const visibleShortcuts = useMemo(() => {
    const selectedIdSet = new Set(selectedShortcutIds);
    const selected = availableShortcuts.filter((item) => selectedIdSet.has(item.id));
    return selected.length > 0 ? selected : availableShortcuts.slice(0, 8);
  }, [availableShortcuts, selectedShortcutIds]);

  const activeOrders = summary.pending + summary.processing;
  const canSeeOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales');

  const openCustomizeModal = () => {
    setDraftShortcutIds(visibleShortcuts.map((item) => item.id));
    setIsCustomizeOpen(true);
  };

  const toggleDraftShortcut = (shortcutId) => {
    setDraftShortcutIds((previous) => (
      previous.includes(shortcutId)
        ? previous.filter((id) => id !== shortcutId)
        : [...previous, shortcutId]
    ));
  };

  const handleConfirmCustomize = () => {
    const nextIds = availableShortcuts
      .map((item) => item.id)
      .filter((id) => draftShortcutIds.includes(id));
    setSelectedShortcutIds(nextIds);
    window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
    setIsCustomizeOpen(false);
  };

  const modalFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button action="cancel" variant="tertiary" onClick={() => setIsCustomizeOpen(false)}>انصراف</Button>
      <Button action="save" showActionIcon onClick={handleConfirmCustomize}>تایید</Button>
    </div>
  );

  return (
    <>
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

                <div className="flex flex-wrap items-center gap-2">
                  <IconButton size="iconSm" label="شخصی سازی دسترسی سریع" tooltip="شخصی سازی دسترسی سریع" onClick={openCustomizeModal}>
                    <Settings2 size={15} />
                  </IconButton>
                  <Button variant="tertiary" size="sm" onClick={() => navigate('/orders')}>
                    مشاهده سفارشات
                  </Button>
                  {canSeeOrders ? (
                    <Button action="create" showActionIcon size="sm" onClick={() => navigate('/orders/new')}>
                      ثبت سفارش جدید
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {visibleShortcuts.map((shortcut) => (
                  <ShortcutCard key={shortcut.id} icon={shortcut.icon} label={shortcut.label} target={shortcut.target} onNavigate={navigate} />
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

      <ModalShell
        isOpen={isCustomizeOpen}
        title="شخصی سازی دکمه های دسترسی سریع"
        onClose={() => setIsCustomizeOpen(false)}
        footer={modalFooter}
        closeButtonMode="icon"
        headerClassName="rounded-t-3xl border-b border-slate-800 bg-slate-900 px-4 py-3 text-white"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {availableShortcuts.map((shortcut) => {
            const isSelected = draftShortcutIds.includes(shortcut.id);
            return (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => toggleDraftShortcut(shortcut.id)}
                className={`focus-ring flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-right transition ${isSelected
                  ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]'
                  : 'border-[rgb(var(--ui-border-soft))] bg-white text-[rgb(var(--ui-text))] hover:border-[rgb(var(--ui-accent-border))]'
                }`}
              >
                <span className="truncate text-sm font-bold">{shortcut.label}</span>
                {isSelected ? <Check size={15} /> : <span className="h-[15px] w-[15px]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </ModalShell>
    </>
  );
};
