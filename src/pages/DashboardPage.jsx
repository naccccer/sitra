import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock3, Factory, PackageCheck } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  StatCard,
  WorkspacePageHeader,
} from '@/components/shared/ui';
import { toPN } from '@/utils/helpers';

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatOrderDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('fa-IR');
};

export const DashboardPage = ({ orders = [] }) => {
  const navigate = useNavigate();
  const summary = useMemo(() => {
    const visibleOrders = Array.isArray(orders) ? orders : [];
    const active = visibleOrders.filter((order) => order.status !== 'archived');
    return {
      activeCount: active.length,
      pending: active.filter((order) => order.status === 'pending').length,
      processing: active.filter((order) => order.status === 'processing').length,
      delivered: active.filter((order) => order.status === 'delivered').length,
      totalAmount: active.reduce((sum, order) => sum + toSafeNumber(order.total), 0),
      latest: active.slice(0, 6),
    };
  }, [orders]);

  return (
    <div className="space-y-5">
      <WorkspacePageHeader
        eyebrow="عملیات روزانه"
        title="داشبورد سفارش‌ها"
        description="نمای فوری از وضعیت جاری سفارش‌ها، حجم کار فعال و آخرین رکوردهای ثبت‌شده."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button action="create" showActionIcon size="lg" onClick={() => navigate('/orders/new')}>سفارش جدید</Button>
            <Button action="openDetails" showActionIcon size="lg" variant="secondary" onClick={() => navigate('/orders')}>مشاهده سفارشات</Button>
          </div>
        )}
        summary={(
          <>
            <Badge tone="accent">سفارش فعال: {toPN(summary.activeCount)}</Badge>
            <Badge tone="warning">در انتظار: {toPN(summary.pending)}</Badge>
            <Badge tone="info">در حال انجام: {toPN(summary.processing)}</Badge>
            <Badge tone="success">تحویل‌شده: {toPN(summary.delivered)}</Badge>
          </>
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={ClipboardList} label="سفارش‌های فعال" value={toPN(summary.activeCount)} meta="رکوردهای غیرآرشیوی" />
        <StatCard icon={Clock3} label="در انتظار" value={toPN(summary.pending)} meta="نیازمند پیگیری" tone="warning" />
        <StatCard icon={Factory} label="در حال تولید" value={toPN(summary.processing)} meta="در جریان اجرا" tone="info" />
        <StatCard icon={PackageCheck} label="تحویل‌شده" value={toPN(summary.delivered)} meta="آماده بستن پرونده" tone="success" />
        <StatCard label="جمع مبالغ فعال" value={toPN(summary.totalAmount.toLocaleString())} meta="تومان" tone="accent" />
      </section>

      <DataTable minWidthClass="min-w-full">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>آخرین سفارش‌ها</DataTableHeaderCell>
            <DataTableHeaderCell align="center">کد رهگیری</DataTableHeaderCell>
            <DataTableHeaderCell align="center">تاریخ ثبت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">مبلغ</DataTableHeaderCell>
            <DataTableHeaderCell align="center">اقدام</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {summary.latest.length === 0 ? (
            <DataTableState
              colSpan={5}
              title="سفارشی برای نمایش وجود ندارد"
              description="پس از ثبت سفارش‌های جدید، آخرین موارد در این بخش نمایش داده می‌شود."
            />
          ) : (
            summary.latest.map((order) => (
              <DataTableRow key={order.id}>
                <DataTableCell tone="emphasis" className="text-[rgb(var(--ui-text))]">{order.customerName || 'بدون نام'}</DataTableCell>
                <DataTableCell align="center">{order.orderCode || '-'}</DataTableCell>
                <DataTableCell align="center">{toPN(formatOrderDate(order.date))}</DataTableCell>
                <DataTableCell align="center" tone="emphasis">{toPN(toSafeNumber(order.total).toLocaleString())}</DataTableCell>
                <DataTableCell align="center">
                  <Button action="openDetails" showActionIcon size="sm" variant="secondary" onClick={() => navigate(`/orders/${order.id}`)}>جزئیات</Button>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
};
