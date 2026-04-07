import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceShellTemplate } from '@/components/shared/ui';
import { AdminOrdersView } from '../components/admin/AdminOrdersView';

export const OrdersPage = ({ orders, ordersHasMore, setOrders, onLoadMoreOrders, onReloadOrders, catalog, profile }) => {
  const navigate = useNavigate();

  return (
    <WorkspaceShellTemplate
<<<<<<< ours
<<<<<<< ours
=======
      showHeader={false}
>>>>>>> theirs
=======
      showHeader={false}
>>>>>>> theirs
      eyebrow="فروش"
      title="میزکار سفارشات"
      description="جستجو، ویرایش، آرشیو و مدیریت پرداخت سفارشات در یک جریان استاندارد."
    >
      <AdminOrdersView
        orders={orders}
        hasMoreOrders={ordersHasMore}
        setOrders={setOrders}
        onLoadMoreOrders={onLoadMoreOrders}
        onReloadOrders={onReloadOrders}
        catalog={catalog}
        profile={profile}
        onCreateOrder={() => navigate('/orders/new')}
        onEditOrder={(order) => navigate(`/orders/${order.id}`)}
      />
    </WorkspaceShellTemplate>
  );
};
