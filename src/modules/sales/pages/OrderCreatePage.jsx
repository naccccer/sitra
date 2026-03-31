import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderForm } from '../components/customer/OrderForm';

export const OrderCreatePage = ({ catalog, setOrders, session, profile }) => {
  const navigate = useNavigate();
  const isStaff = Boolean(session?.authenticated);
  const wrapperClassName = isStaff
    ? 'mx-auto max-w-[1300px]'
    : 'mx-auto max-w-[1300px] px-4 py-4 lg:px-6';

  return (
    <div className={wrapperClassName}>
      <OrderForm
        catalog={catalog}
        setOrders={setOrders}
        profile={profile}
        staffMode={isStaff}
        onGoToLogin={() => navigate('/login')}
        onGoToPricing={() => navigate('/master-data/pricing?tab=custom')}
      />
    </div>
  );
};
