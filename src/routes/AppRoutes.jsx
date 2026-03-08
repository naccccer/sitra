import React from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { AccessDenied } from '../components/shared/AccessDenied'
import { SettingsPage } from '../kernel/pages/SettingsPage'
import { SystemSettingsPage } from '../kernel/pages/SystemSettingsPage'
import { OwnerConsolePage } from '../kernel/pages/OwnerConsolePage'
import { AuditLogsPage } from '../kernel/pages/AuditLogsPage'
import { isModuleEnabled, moduleLabelFa } from '../kernel/moduleRegistry'
import { OrderCreatePage, OrderDetailPage, OrdersPage } from '../modules/sales'
import { AdminPage } from '../modules/master-data'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { UsersPage } from '../modules/users-access'
import { ProfilePage } from '../pages/ProfilePage'

const ProtectedRoute = ({ isAuthenticated }) => {
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

const ModuleRouteGuard = ({ session, moduleId, children }) => {
  if (isModuleEnabled(session?.modules, moduleId)) {
    return children
  }

  return <AccessDenied message={`ماژول ${moduleLabelFa(moduleId, session?.modules)} غیرفعال است.`} />
}

const CapabilityRouteGuard = ({ session, capability, children }) => {
  if (!capability || Boolean(session?.capabilities?.[capability])) {
    return children
  }

  return <AccessDenied message="دسترسی کافی وجود ندارد." />
}

const OwnerRouteGuard = ({ session, children }) => {
  if (session?.capabilities?.canManageSystemSettings) {
    return children
  }

  return <Navigate to="/" replace />
}

export const AppRoutes = ({
  session,
  catalog,
  setCatalog,
  profile,
  setProfile,
  orders,
  ordersHasMore,
  setOrders,
  onLoadMoreOrders,
  onLogin,
  onLogout,
  onRefreshSession,
}) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} onLogin={onLogin} profile={profile} />} />
      <Route
        path="/orders/new"
        element={(
          session?.authenticated ? (
            <CapabilityRouteGuard session={session} capability="canManageOrders">
              <ModuleRouteGuard session={session} moduleId="sales">
                <MainLayout onLogout={onLogout} profile={profile} session={session}>
                  <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
                </MainLayout>
              </ModuleRouteGuard>
            </CapabilityRouteGuard>
          ) : (
            <ModuleRouteGuard session={session} moduleId="sales">
              <OrderCreatePage catalog={catalog} orders={orders} setOrders={setOrders} session={session} profile={profile} />
            </ModuleRouteGuard>
          )
        )}
      />

      <Route element={<ProtectedRoute isAuthenticated={Boolean(session?.authenticated)} />}>
        <Route element={<MainLayout onLogout={onLogout} profile={profile} session={session} />}>
          <Route index element={<CapabilityRouteGuard session={session} capability="canAccessDashboard"><ModuleRouteGuard session={session} moduleId="sales"><DashboardPage orders={orders} /></ModuleRouteGuard></CapabilityRouteGuard>} />
          <Route path="orders" element={<CapabilityRouteGuard session={session} capability="canManageOrders"><ModuleRouteGuard session={session} moduleId="sales"><OrdersPage orders={orders} ordersHasMore={ordersHasMore} setOrders={setOrders} onLoadMoreOrders={onLoadMoreOrders} catalog={catalog} profile={profile} /></ModuleRouteGuard></CapabilityRouteGuard>} />
          <Route path="orders/:id" element={<CapabilityRouteGuard session={session} capability="canManageOrders"><ModuleRouteGuard session={session} moduleId="sales"><OrderDetailPage catalog={catalog} orders={orders} setOrders={setOrders} profile={profile} /></ModuleRouteGuard></CapabilityRouteGuard>} />

          <Route path="settings" element={<SettingsPage session={session} />}>
            <Route path="catalog" element={<CapabilityRouteGuard session={session} capability="canManageCatalog"><ModuleRouteGuard session={session} moduleId="master-data"><AdminPage catalog={catalog} setCatalog={setCatalog} session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />
            <Route path="profile" element={<CapabilityRouteGuard session={session} capability="canManageProfile"><ModuleRouteGuard session={session} moduleId="master-data"><ProfilePage profile={profile} setProfile={setProfile} session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />
            <Route path="users" element={<CapabilityRouteGuard session={session} capability="canManageUsers"><ModuleRouteGuard session={session} moduleId="users-access"><UsersPage session={session} onRefreshSession={onRefreshSession} /></ModuleRouteGuard></CapabilityRouteGuard>} />
            <Route path="audit" element={<CapabilityRouteGuard session={session} capability="canViewAuditLogs"><AuditLogsPage /></CapabilityRouteGuard>} />
            <Route path="system" element={<Navigate to={canManageSystemSettings ? '/owner/modules' : '/settings'} replace />} />
          </Route>

          <Route
            path="owner"
            element={(
              <OwnerRouteGuard session={session}>
                <OwnerConsolePage />
              </OwnerRouteGuard>
            )}
          >
            <Route index element={<Navigate to="/owner/modules" replace />} />
            <Route path="modules" element={<SystemSettingsPage session={session} onRegistryUpdated={onRefreshSession} />} />
            <Route path="users" element={<UsersPage session={session} onRefreshSession={onRefreshSession} />} />
          </Route>

          <Route path="admin" element={<Navigate to="/settings/catalog" replace />} />
          <Route path="profile" element={<Navigate to="/settings/profile" replace />} />
          <Route path="users" element={<Navigate to="/settings/users" replace />} />
          <Route path="system-settings" element={<Navigate to={canManageSystemSettings ? '/owner/modules' : '/settings'} replace />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={session?.authenticated ? '/' : '/orders/new'} replace />}
      />
    </Routes>
  )
}
