import React from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { AdminPage } from '../pages/AdminPage';
import { DashboardPage } from '../pages/DashboardPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { OrderCreatePage } from '../pages/OrderCreatePage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProductionPage } from '../pages/ProductionPage';
import { UsersPage } from '../pages/UsersPage';

const ProtectedRoute = ({ isAuthenticated }) => {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const AppRoutes = ({
  session,
  catalog,
  setCatalog,
  profile,
  setProfile,
  orders,
  setOrders,
  onLogin,
  onLogout,
}) => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} onLogin={onLogin} profile={profile} />} />
      <Route
        path="/orders/new"
        element={session?.authenticated ? (
          <MainLayout onLogout={onLogout} profile={profile}>
            <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
          </MainLayout>
        ) : (
          <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
        )}
      />

      <Route element={<ProtectedRoute isAuthenticated={Boolean(session?.authenticated)} />}>
        <Route element={<MainLayout onLogout={onLogout} profile={profile} />}>
          <Route index element={<DashboardPage orders={orders} />} />
          <Route path="orders" element={<OrdersPage orders={orders} setOrders={setOrders} catalog={catalog} profile={profile} />} />
          <Route path="orders/:id" element={<OrderDetailPage catalog={catalog} orders={orders} setOrders={setOrders} profile={profile} />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="admin" element={<AdminPage catalog={catalog} setCatalog={setCatalog} session={session} />} />
          <Route path="profile" element={<ProfilePage profile={profile} setProfile={setProfile} session={session} />} />
          <Route path="users" element={<UsersPage session={session} />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={session?.authenticated ? '/' : '/orders/new'} replace />}
      />
    </Routes>
  );
};
