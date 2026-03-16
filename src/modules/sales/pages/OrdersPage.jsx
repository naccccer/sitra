import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminOrdersView } from '../components/admin/AdminOrdersView';

export const OrdersPage = ({ orders, ordersHasMore, setOrders, onLoadMoreOrders, catalog, profile }) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full">
      <AdminOrdersView
        orders={orders}
        hasMoreOrders={ordersHasMore}
        setOrders={setOrders}
        onLoadMoreOrders={onLoadMoreOrders}
        catalog={catalog}
        profile={profile}
        onEditOrder={(order) => navigate(`/orders/${order.id}`)}
      />
    </div>
  );
};
