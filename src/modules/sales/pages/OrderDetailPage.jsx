import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, PageHeader, WorkspaceCard } from '@/components/shared/ui';
import { OrderForm } from '../components/customer/OrderForm';

export const OrderDetailPage = ({ catalog, orders, setOrders, profile }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const targetOrder = useMemo(
    () => (Array.isArray(orders) ? orders.find((order) => String(order.id) === String(id)) : null),
    [orders, id],
  );

  if (!targetOrder) {
    return (
      <WorkspaceCard className="mx-auto max-w-2xl" padding="md">
        <div className="text-center">
          <h2 className="text-sm font-black text-[rgb(var(--ui-text))]">سفارش موردنظر پیدا نشد</h2>
          <p className="mt-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">ممکن است سفارش حذف شده باشد یا شناسه مسیر نادرست باشد.</p>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            <ArrowRight size={14} />
            بازگشت به لیست سفارشات
          </Button>
        </div>
      </WorkspaceCard>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <PageHeader
        eyebrow="فروش"
        title="ویرایش سفارش"
        description={`بازبینی و بروزرسانی سفارش ${targetOrder.orderCode || ''} برای ${targetOrder.customerName || 'مشتری'}.`}
      />
      <OrderForm
        key={targetOrder.id}
        catalog={catalog}
        orders={orders}
        setOrders={setOrders}
        profile={profile}
        editingOrder={targetOrder}
        onCancelEdit={() => navigate('/orders')}
        onGoToPricing={() => navigate('/master-data/pricing?tab=custom')}
        staffMode
      />
    </div>
  );
};
