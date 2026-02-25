import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginView } from '../components/auth/LoginView';

const toRedirectPath = (from) => {
  if (!from || typeof from !== 'object') return '/';

  const pathname = from.pathname || '/';
  const search = from.search || '';
  const hash = from.hash || '';

  return `${pathname}${search}${hash}`;
};

export const LoginPage = ({ session, onLogin, profile }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (session?.authenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (role) => {
    await onLogin(role);

    const nextPath = toRedirectPath(location.state?.from);
    navigate(nextPath, { replace: true });
  };

  return (
    <LoginView
      profile={profile}
      onLogin={handleLogin}
      onGoToCustomer={() => navigate('/orders/new')}
    />
  );
};
