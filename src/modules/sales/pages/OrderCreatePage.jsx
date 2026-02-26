import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderForm } from '../components/customer/OrderForm';

export const OrderCreatePage = ({ catalog, orders, setOrders, session, profile }) => {
  const navigate = useNavigate();
  const isStaff = Boolean(session?.authenticated);
  const wrapperClassName = isStaff
    ? 'mx-auto max-w-[1300px]'
    : 'mx-auto max-w-[1300px] px-4 py-4 lg:px-6';

  return (
    <div className={wrapperClassName}>
      <OrderForm
        catalog={catalog}
        orders={orders}
        setOrders={setOrders}
        profile={profile}
        orderSource={isStaff ? 'admin' : 'customer'}
        staffMode={isStaff}
        onGoToLogin={() => navigate('/login')}
      />
    </div>
  );
};
