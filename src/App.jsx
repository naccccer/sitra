import React from 'react';
import { AppRoutes } from '@/routes/AppRoutes';
import { OfflineSyncBanner } from '@/components/shared/OfflineSyncBanner';
import { Button, UniversalState } from '@/components/shared/ui';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useOfflineSync } from '@/hooks/useOfflineSync';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell auth-entry-shell flex items-center justify-center px-4 py-8" dir="rtl">
          <div className="auth-entry-orb auth-entry-orb-primary" aria-hidden="true" />
          <UniversalState
            state="error"
            title="اختلال موقت"
            description="لطفا صفحه را مجددا بارگذاری کنید."
            className="auth-entry-state-card max-w-md"
          />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => window.location.reload()} variant="primary" size="lg">
              بارگذاری مجدد
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const {
    session,
    catalog,
    profile,
    orders,
    ordersHasMore,
    isHydrating,
    setOrders,
    setCatalog,
    setProfile,
    loadMoreOrders,
    runOfflineSync,
    handleLogin,
    handleLogout,
    handleRefreshSession,
  } = useBootstrap();

  const {
    isOnline,
    offlineQueueSnapshot,
    handleSyncNow,
    handleAcceptConflict,
    handleRetryConflict,
  } = useOfflineSync({ runOfflineSync });

  if (isHydrating) {
    return (
      <div className="app-shell auth-entry-shell flex items-center justify-center px-4 py-8" dir="rtl">
        <div className="auth-entry-orb auth-entry-orb-secondary" aria-hidden="true" />
        <UniversalState
          state="loading"
          title="در حال بارگذاری اطلاعات"
          description="نشست، دسترسی ها و داده های پایه در حال آماده سازی است."
          className="auth-entry-state-card max-w-sm"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-shell font-sans" dir="rtl">
        <OfflineSyncBanner
          isOnline={isOnline}
          queueSnapshot={offlineQueueSnapshot}
          onSyncNow={handleSyncNow}
          onAcceptConflict={handleAcceptConflict}
          onRetryConflict={handleRetryConflict}
        />
        <AppRoutes
          session={session}
          catalog={catalog}
          setCatalog={setCatalog}
          profile={profile}
          setProfile={setProfile}
          orders={orders}
          ordersHasMore={ordersHasMore}
          setOrders={setOrders}
          onLoadMoreOrders={loadMoreOrders}
          onReloadOrders={handleRefreshSession}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefreshSession={handleRefreshSession}
        />
      </div>
    </ErrorBoundary>
  );
}
