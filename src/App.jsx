import React from 'react';
import { AppRoutes } from '@/routes/AppRoutes';
import { OfflineSyncBanner } from '@/components/shared/OfflineSyncBanner';
import { Button, Card } from '@/components/shared/ui';
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
        <div className="app-shell flex items-center justify-center px-4 text-slate-600" dir="rtl">
          <Card className="w-full max-w-md text-center" padding="lg">
            <h2 className="mb-2 text-xl font-black">خطایی رخ داد</h2>
            <p className="mb-4 text-sm">لطفا صفحه را مجددا بارگذاری کنید.</p>
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
      <div className="app-shell flex items-center justify-center text-slate-600 font-bold" dir="rtl">
        در حال بارگذاری اطلاعات...
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
