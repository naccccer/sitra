import React from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { OfflineSyncBanner } from './components/shared/OfflineSyncBanner';
import { useBootstrap } from './hooks/useBootstrap';
import { useOfflineSync } from './hooks/useOfflineSync';

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
          <div className="text-center p-8">
            <h2 className="text-xl font-black mb-2">خطایی رخ داد</h2>
            <p className="text-sm mb-4">لطفاً صفحه را مجدداً بارگذاری کنید.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">
              بارگذاری مجدد
            </button>
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 font-bold" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        در حال بارگذاری اطلاعات...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
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
