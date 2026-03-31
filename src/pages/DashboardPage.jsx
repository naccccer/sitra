import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock3, Factory, PackageCheck } from 'lucide-react';
import {
  Badge,
  EmptyState,
  StatCard,
  StatsStrip,
  WorkspaceCard,
} from '@/components/shared/ui';
import { toPN } from '@/utils/helpers';

const toSafeNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const formatOrderDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('fa-IR');
};

export const DashboardPage = ({ orders = [] }) => {
  const summary = useMemo(() => {
    const visibleOrders = Array.isArray(orders) ? orders : [];
    const active = visibleOrders.filter((order) => order.status !== 'archived');
    const pending = active.filter((order) => order.status === 'pending').length;
    const processing = active.filter((order) => order.status === 'processing').length;
    const delivered = active.filter((order) => order.status === 'delivered').length;
    const totalAmount = active.reduce((sum, order) => sum + toSafeNumber(order.total), 0);

    return {
      activeCount: active.length,
      pending,
      processing,
      delivered,
      totalAmount,
      latest: active.slice(0, 6),
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <StatsStrip>
        <StatCard
          tone="default"
          icon={<ClipboardList size={16} />}
          title="سفارشات فعال"
          value={toPN(summary.activeCount)}
          hint="سفارش‌های در جریان خارج از بایگانی"
        />
        <StatCard
          tone="accent"
          icon={<Clock3 size={16} />}
          title="در انتظار"
          value={toPN(summary.pending)}
          hint="نیازمند پیگیری یا شروع"
        />
        <StatCard
          tone="elevated"
          icon={<Factory size={16} />}
          title="در حال تولید"
          value={toPN(summary.processing)}
          hint="در مسیر آماده‌سازی و اجرا"
        />
        <StatCard
          tone="inset"
          icon={<PackageCheck size={16} />}
          title="تحویل‌شده"
          value={toPN(summary.delivered)}
          hint="سفارش‌های تکمیل‌شده"
        />
      </StatsStrip>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <WorkspaceCard
          title="آخرین سفارش‌ها"
          description="نمایش تازه‌ترین رکوردهای فعال برای مرور سریع وضعیت روز."
          actions={<Badge emphasis="outline" tone="neutral">نمایش {toPN(summary.latest.length)} مورد</Badge>}
        >
          {summary.latest.length === 0 ? (
            <EmptyState
              title="سفارشی برای نمایش وجود ندارد"
              description="پس از ثبت سفارش‌های جدید، آخرین موارد در این بخش نمایش داده می‌شود."
            />
          ) : (
            <div className="divide-y divide-[rgba(var(--ui-border),0.7)]">
              {summary.latest.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="focus-ring flex items-center justify-between px-4 py-3 transition-colors hover:bg-[rgba(var(--ui-surface-muted),0.75)]"
                >
                  <div>
                    <div className="text-xs font-black text-[rgb(var(--ui-text))]">{order.customerName || 'بدون نام'}</div>
                    <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">
                      {order.orderCode || '-'} - {toPN(formatOrderDate(order.date))}
                    </div>
                  </div>
                  <div className="text-xs font-black tabular-nums text-[rgb(var(--ui-text))]">
                    {toPN(toSafeNumber(order.total).toLocaleString())}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title="جمع مبالغ فعال"
          description="برآورد سریع از ارزش سفارش‌های جاری خارج از بایگانی."
          surface="accent"
          padding="md"
        >
          <div className="space-y-3">
            <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">جمع مبالغ سفارشات فعال</div>
            <div className="text-2xl font-black tabular-nums text-[rgb(var(--ui-text))]">
              {toPN(summary.totalAmount.toLocaleString())}
              <span className="me-1 text-[10px] font-bold text-[rgb(var(--ui-text-muted))]">تومان</span>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[rgba(var(--ui-border),0.72)] bg-[rgba(var(--ui-surface-elevated),0.78)] px-3 py-2 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">
              این عدد فقط سفارش‌های فعال را در نظر می‌گیرد و سفارش‌های بایگانی‌شده در آن لحاظ نشده‌اند.
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
};
