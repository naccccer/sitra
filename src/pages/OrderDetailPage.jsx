import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-sm font-black text-slate-800">سفارش موردنظر پیدا نشد</h2>
        <p className="mt-2 text-xs font-bold text-slate-500">ممکن است سفارش حذف شده باشد یا شناسه مسیر نادرست باشد.</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
        >
          <ArrowRight size={14} />
          بازگشت به لیست سفارشات
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <OrderForm
        key={targetOrder.id}
        catalog={catalog}
        orders={orders}
        setOrders={setOrders}
        profile={profile}
        editingOrder={targetOrder}
        onCancelEdit={() => navigate('/orders')}
        staffMode
      />
    </div>
  );
};
