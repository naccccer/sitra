import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock3, Factory, PackageCheck } from 'lucide-react';
import { toPN } from '../utils/helpers';

const toSafeNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700"><ClipboardList size={16} /></div>
          <div className="text-xs font-bold text-slate-500">سفارشات فعال</div>
          <div className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{toPN(summary.activeCount)}</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700"><Clock3 size={16} /></div>
          <div className="text-xs font-bold text-amber-700">در انتظار</div>
          <div className="mt-1 text-2xl font-black text-amber-900 tabular-nums">{toPN(summary.pending)}</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700"><Factory size={16} /></div>
          <div className="text-xs font-bold text-blue-700">در حال تولید</div>
          <div className="mt-1 text-2xl font-black text-blue-900 tabular-nums">{toPN(summary.processing)}</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="mb-2 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700"><PackageCheck size={16} /></div>
          <div className="text-xs font-bold text-emerald-700">تحویل‌شده</div>
          <div className="mt-1 text-2xl font-black text-emerald-900 tabular-nums">{toPN(summary.delivered)}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-800">آخرین سفارش‌ها</div>
        {summary.latest.length === 0 ? (
          <div className="px-4 py-6 text-xs font-bold text-slate-500">هنوز سفارشی برای نمایش وجود ندارد.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.latest.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div>
                  <div className="text-xs font-black text-slate-800">{order.customerName || 'بدون نام'}</div>
                  <div className="text-[11px] font-bold text-slate-500">{order.orderCode || '-'} - {order.date || '-'}</div>
                </div>
                <div className="text-xs font-black text-slate-900 tabular-nums">{toPN(toSafeNumber(order.total).toLocaleString())}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500">جمع مبالغ سفارشات فعال</div>
        <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
          {toPN(summary.totalAmount.toLocaleString())}
          <span className="mr-1 text-[10px] font-bold text-slate-500">تومان</span>
        </div>
      </section>
    </div>
  );
};
