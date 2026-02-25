import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminOrdersView } from '../components/admin/AdminOrdersView';

export const OrdersPage = ({ orders, setOrders, catalog, profile }) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1300px]">
      <AdminOrdersView
        orders={orders}
        setOrders={setOrders}
        catalog={catalog}
        profile={profile}
        onEditOrder={(order) => navigate(`/orders/${order.id}`)}
      />
    </div>
  );
};
