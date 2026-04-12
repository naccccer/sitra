import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Clock3, PackageCheck, Settings2 } from 'lucide-react';
import { Button, Card, IconButton, ModalShell, WorkspaceShellTemplate } from '@/components/shared/ui';
import { isModuleEnabled } from '@/kernel/moduleRegistry';
import { getVisibleAccountingTabs } from '@/modules/accounting/navigation';
import { useTabSettings } from '@/modules/accounting/hooks/useTabSettings';
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation';
import {
  buildAvailableShortcuts,
  getDefaultShortcutIds,
  getShortcutStorageKey,
  readStoredShortcutIds,
  toVisibleShortcuts,
} from '@/pages/dashboardShortcuts';
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
  const [isShortcutCustomizerOpen, setIsShortcutCustomizerOpen] = useState(false);
  const [draftShortcutIds, setDraftShortcutIds] = useState([]);
  const [shortcutSelectionVersion, setShortcutSelectionVersion] = useState(0);
  const capabilities = useMemo(
    () => (session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}),
    [session],
  );
  const modules = useMemo(() => (Array.isArray(session?.modules) ? session.modules : []), [session]);
  const permissions = useMemo(() => (Array.isArray(session?.permissions) ? session.permissions : []), [session]);
  const { isVisible } = useTabSettings();

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

  const availableShortcuts = useMemo(() => buildAvailableShortcuts({
    capabilities,
    modules,
    inventoryTabs: getVisibleInventoryTabs(permissions),
    accountingTabs: getVisibleAccountingTabs(permissions, isVisible),
  }), [capabilities, isVisible, modules, permissions]);

  const shortcutStorageKey = useMemo(() => getShortcutStorageKey(session), [session]);

  const selectedShortcutIds = useMemo(() => {
    void shortcutSelectionVersion;
    const availableIds = new Set(availableShortcuts.map((item) => item.id));
    const savedIds = readStoredShortcutIds(shortcutStorageKey) || [];
    const nextSelected = savedIds.filter((id) => availableIds.has(id));
    return nextSelected.length > 0 ? nextSelected : getDefaultShortcutIds(availableShortcuts);
  }, [availableShortcuts, shortcutSelectionVersion, shortcutStorageKey]);

  const visibleShortcuts = useMemo(
    () => toVisibleShortcuts(availableShortcuts, selectedShortcutIds),
    [availableShortcuts, selectedShortcutIds],
  );

  const activeOrders = summary.pending + summary.processing;

  const openShortcutCustomizer = () => {
    setDraftShortcutIds(selectedShortcutIds);
    setIsShortcutCustomizerOpen(true);
  };

  const closeShortcutCustomizer = () => {
    setIsShortcutCustomizerOpen(false);
    setDraftShortcutIds([]);
  };

  const toggleShortcutDraft = (shortcutId) => {
    setDraftShortcutIds((prev) => (
      prev.includes(shortcutId)
        ? prev.filter((id) => id !== shortcutId)
        : [...prev, shortcutId]
    ));
  };

  const confirmShortcutCustomizer = () => {
    const nextSelected = draftShortcutIds.length > 0 ? draftShortcutIds : getDefaultShortcutIds(availableShortcuts);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(shortcutStorageKey, JSON.stringify(nextSelected));
      setShortcutSelectionVersion((prev) => prev + 1);
      closeShortcutCustomizer();
    } catch {
      // Ignore storage failures and keep homepage shortcuts interactive.
    }
  };

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
                <IconButton
                  size="iconSm"
                  variant="tertiary"
                  label="شخصی سازی دسترسی سریع"
                  tooltip="شخصی سازی دسترسی سریع"
                  onClick={openShortcutCustomizer}
                >
                  <Settings2 size={14} />
                </IconButton>
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

      <ModalShell
        isOpen={isShortcutCustomizerOpen}
        onClose={closeShortcutCustomizer}
        closeButtonMode="icon"
        title="شخصی سازی دسترسی سریع"
        maxWidthClass="max-w-2xl"
        overlayClassName="bg-slate-950/60 backdrop-blur-lg"
        headerClassName="rounded-t-3xl border-b border-slate-800 bg-slate-900 px-4 py-3 text-white"
        overlayClassName="bg-transparent backdrop-blur-0"
        footer={(
          <div className="flex items-center justify-start gap-2" dir="ltr">
            <Button type="button" variant="secondary" onClick={closeShortcutCustomizer}>انصراف</Button>
            <Button type="button" action="save" onClick={confirmShortcutCustomizer}>تأیید</Button>
          </div>
        )}
      >
        <div className="grid max-h-[54vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {availableShortcuts.map((shortcut) => {
            const checked = draftShortcutIds.includes(shortcut.id);
            return (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => toggleShortcutDraft(shortcut.id)}
                className={`focus-ring flex items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-right text-xs font-bold transition ${checked ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]' : 'border-[rgb(var(--ui-border-soft))] bg-white text-[rgb(var(--ui-text-muted))]'}`}
              >
                <span className="truncate">{shortcut.label}</span>
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${checked ? 'bg-[rgb(var(--ui-accent-strong))] text-white' : 'bg-[rgb(var(--ui-surface-muted))] text-transparent'}`}>
                  <Check size={11} />
                </span>
              </button>
            );
          })}
        </div>
      </ModalShell>
    </WorkspaceShellTemplate>
  );
};
