import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock3, Factory, PackageCheck } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/shared/ui';
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
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="md">
          <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700"><ClipboardList size={16} /></div>
          <div className="text-xs font-bold text-slate-500">سفارشات فعال</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-slate-900">{toPN(summary.activeCount)}</div>
        </Card>

        <Card className="border-amber-200 bg-amber-50" padding="md">
          <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700"><Clock3 size={16} /></div>
          <div className="text-xs font-bold text-amber-700">در انتظار</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-amber-900">{toPN(summary.pending)}</div>
        </Card>

        <Card className="border-blue-200 bg-blue-50" padding="md">
          <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700"><Factory size={16} /></div>
          <div className="text-xs font-bold text-blue-700">در حال تولید</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-blue-900">{toPN(summary.processing)}</div>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50" padding="md">
          <div className="mb-2 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700"><PackageCheck size={16} /></div>
          <div className="text-xs font-bold text-emerald-700">تحویل‌شده</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-emerald-900">{toPN(summary.delivered)}</div>
        </Card>
      </section>

      <section>
        <Card className="overflow-hidden" padding="none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-black text-slate-800">آخرین سفارش‌ها</div>
            <Badge tone="neutral">نمایش {toPN(summary.latest.length)} مورد</Badge>
          </div>
          {summary.latest.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="سفارشی برای نمایش وجود ندارد"
                description="پس از ثبت سفارش‌های جدید، آخرین موارد در این بخش نمایش داده می‌شود."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.latest.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="focus-ring flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <div className="text-xs font-black text-slate-800">{order.customerName || 'بدون نام'}</div>
                    <div className="text-[11px] font-bold text-slate-500">{order.orderCode || '-'} - {toPN(formatOrderDate(order.date))}</div>
                  </div>
                  <div className="text-xs font-black tabular-nums text-slate-900">{toPN(toSafeNumber(order.total).toLocaleString())}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <Card padding="md">
          <div className="text-xs font-bold text-slate-500">جمع مبالغ سفارشات فعال</div>
          <div className="mt-1 text-lg font-black tabular-nums text-slate-900">
            {toPN(summary.totalAmount.toLocaleString())}
            <span className="mr-1 text-[10px] font-bold text-slate-500">تومان</span>
          </div>
        </Card>
      </section>
    </div>
  );
};
