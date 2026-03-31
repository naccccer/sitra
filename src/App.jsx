import React from 'react';
import { AppRoutes } from '@/routes/AppRoutes';
import { OfflineSyncBanner } from '@/components/shared/OfflineSyncBanner';
import { Badge, Button, Card } from '@/components/shared/ui';
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
          <Card tone="glass" className="auth-entry-state-card max-w-md" padding="lg">
            <div className="mb-3 flex justify-center">
              <Badge tone="danger">اختلال موقت</Badge>
            </div>
            <h2 className="mb-2 text-xl font-black text-[rgb(var(--ui-text))]">خطایی رخ داد</h2>
            <p className="mb-4 text-sm font-bold leading-7 text-[rgb(var(--ui-text-muted))]">لطفا صفحه را مجددا بارگذاری کنید.</p>
            <Button onClick={() => window.location.reload()} variant="primary" size="lg">
              بارگذاری مجدد
            </Button>
          </Card>
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
        <Card tone="glass" className="auth-entry-state-card max-w-sm" padding="lg">
          <div className="section-kicker">Sitra ERP</div>
          <h2 className="mt-2 text-lg font-black text-[rgb(var(--ui-text))]">در حال بارگذاری اطلاعات</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[rgb(var(--ui-text-muted))]">
            نشست، دسترسی ها و داده های پایه در حال آماده سازی است.
          </p>
        </Card>
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
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefreshSession={handleRefreshSession}
        />
      </div>
    </ErrorBoundary>
  );
}
