import React from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { OrderCreatePage, OrderDetailPage, OrdersPage } from '../modules/sales';
import { AdminPage } from '../modules/master-data';
import { InventoryPage } from '../modules/inventory';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductionPage } from '../modules/production';
import { UsersPage } from '../modules/users-access';
import { ProfilePage } from '../pages/ProfilePage';

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
          <MainLayout onLogout={onLogout} profile={profile} session={session}>
            <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
          </MainLayout>
        ) : (
          <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
        )}
      />

      <Route element={<ProtectedRoute isAuthenticated={Boolean(session?.authenticated)} />}>
        <Route element={<MainLayout onLogout={onLogout} profile={profile} session={session} />}>
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
