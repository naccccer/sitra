import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { SettingsPage } from '../kernel/pages/SettingsPage'
import { SystemSettingsPage } from '../kernel/pages/SystemSettingsPage'
import { OwnerConsolePage } from '../kernel/pages/OwnerConsolePage'
import { AuditLogsPage } from '../kernel/pages/AuditLogsPage'
import { OrderCreatePage, OrderDetailPage, OrdersPage } from '../modules/sales'
import { CustomersPage } from '../modules/customers'
import { HumanResourcesPage } from '../modules/human-resources'
import { InventoryV2Page } from '../modules/inventory'
import { AccountingPage } from '../modules/accounting'
import { AdminPage } from '../modules/master-data'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { UsersPage } from '../modules/users-access'
import { ProfilePage } from '../pages/ProfilePage'
import { CapabilityRouteGuard, ModuleRouteGuard, OwnerRouteGuard, ProtectedRoute } from './RouteGuards'
import { SETTINGS_ALIAS_REDIRECTS, SETTINGS_ROUTE_POLICIES } from './routePolicies'

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

  const renderSettingsView = (policy) => {
    if (policy.view === 'catalog') {
      return <AdminPage catalog={catalog} setCatalog={setCatalog} session={session} />
    }
    return <AuditLogsPage />
  }

  const renderSettingsRoute = (policy) => {
    const content = renderSettingsView(policy)
    const withModuleGuard = policy.moduleId
      ? <ModuleRouteGuard session={session} moduleId={policy.moduleId}>{content}</ModuleRouteGuard>
      : content

    return (
      <CapabilityRouteGuard session={session} capability={policy.capability}>
        {withModuleGuard}
      </CapabilityRouteGuard>
    )
  }

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
          <Route path="customers" element={<CapabilityRouteGuard session={session} capability="canManageCustomers"><ModuleRouteGuard session={session} moduleId="customers"><CustomersPage session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />
          <Route path="human-resources" element={<CapabilityRouteGuard session={session} capability="canAccessHumanResources"><ModuleRouteGuard session={session} moduleId="human-resources"><HumanResourcesPage session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />
          <Route path="inventory" element={<CapabilityRouteGuard session={session} capability="canAccessInventory"><ModuleRouteGuard session={session} moduleId="inventory"><InventoryV2Page session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />
          <Route path="accounting" element={<CapabilityRouteGuard session={session} capability="canAccessAccounting"><ModuleRouteGuard session={session} moduleId="accounting"><AccountingPage session={session} /></ModuleRouteGuard></CapabilityRouteGuard>} />

          <Route
            path="profile"
            element={(
              <CapabilityRouteGuard session={session} capability="canManageProfile">
                <ModuleRouteGuard session={session} moduleId="master-data">
                  <ProfilePage profile={profile} setProfile={setProfile} session={session} />
                </ModuleRouteGuard>
              </CapabilityRouteGuard>
            )}
          />

          <Route
            path="users-access"
            element={(
              <CapabilityRouteGuard session={session} capability="canManageUsers">
                <ModuleRouteGuard session={session} moduleId="users-access">
                  <UsersPage session={session} onRefreshSession={onRefreshSession} />
                </ModuleRouteGuard>
              </CapabilityRouteGuard>
            )}
          />

          <Route path="management" element={<SettingsPage session={session} />}>
            {SETTINGS_ROUTE_POLICIES.map((policy) => (
              <Route key={policy.path} path={policy.path} element={renderSettingsRoute(policy)} />
            ))}
            <Route path="users" element={<Navigate to="/users-access" replace />} />
            <Route path="system" element={<Navigate to={canManageSystemSettings ? '/owner/modules' : '/management'} replace />} />
          </Route>

          <Route path="owner/users" element={<Navigate to="/users-access" replace />} />

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
          </Route>

          {SETTINGS_ALIAS_REDIRECTS.map((alias) => (
            <Route key={alias.path} path={alias.path} element={<Navigate to={alias.to} replace />} />
          ))}
          <Route path="settings" element={<Navigate to="/management" replace />} />
          <Route path="settings/catalog" element={<Navigate to="/management/catalog" replace />} />
          <Route path="settings/users" element={<Navigate to="/users-access" replace />} />
          <Route path="settings/audit" element={<Navigate to="/management/audit" replace />} />
          <Route path="settings/profile" element={<Navigate to="/profile" replace />} />
          <Route path="users" element={<Navigate to="/users-access" replace />} />
          <Route path="system-settings" element={<Navigate to={canManageSystemSettings ? '/owner/modules' : '/management'} replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={session?.authenticated ? '/' : '/orders/new'} replace />} />
    </Routes>
  )
}
