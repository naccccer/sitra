import React, { useCallback, useEffect, useRef, useState } from 'react';
import { initialCatalog } from './data/mockData';
import { AppRoutes } from './routes/AppRoutes';
import { api, setCsrfToken } from './services/api';
import { OfflineSyncBanner } from './components/shared/OfflineSyncBanner';
import { defaultProfile, normalizeProfile } from './utils/profile';
import { clearBootstrapCache, readBootstrapCache, writeBootstrapCache } from './services/bootstrapCache';
import {
  dropSalesOfflineOperation,
  getSalesOfflineQueueSnapshot,
  retrySalesOfflineConflict,
  subscribeSalesOfflineQueue,
  syncSalesOfflineQueue,
} from './services/salesOfflineQueue';

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

const EMPTY_SESSION = {
  authenticated: false,
  role: null,
  username: null,
  permissions: [],
  capabilities: {},
  modules: [],
};

const EMPTY_OFFLINE_QUEUE_SNAPSHOT = {
  pendingCount: 0,
  authBlockedCount: 0,
  conflictCount: 0,
  isSyncing: false,
  firstConflict: null,
};

const deriveCapabilitiesFromRole = (role) => {
  const normalizedRole = String(role || '').trim();
  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: true,
      canManageUsers: true,
      canViewAuditLogs: true,
      canManageProfile: true,
      canManageSystemSettings: normalizedRole === 'admin',
    };
  }

  if (normalizedRole === 'sales') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canManageProfile: false,
      canManageSystemSettings: false,
    };
  }

  return {
    canAccessDashboard: false,
    canManageOrders: false,
    canManageCatalog: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageProfile: false,
    canManageSystemSettings: false,
  };
};

const normalizeSession = (rawSession, fallbackRole = null, bootstrapData = null) => {
  const effectiveRole = rawSession?.role || fallbackRole || null;
  const permissions = Array.isArray(bootstrapData?.permissions) ? bootstrapData.permissions : [];
  const capabilities = bootstrapData?.capabilities && typeof bootstrapData.capabilities === 'object'
    ? bootstrapData.capabilities
    : deriveCapabilitiesFromRole(effectiveRole);
  const modules = Array.isArray(bootstrapData?.modules) ? bootstrapData.modules : [];

  if (!rawSession || typeof rawSession !== 'object') {
    return {
      ...EMPTY_SESSION,
      role: effectiveRole,
      username: null,
      permissions,
      capabilities,
      modules,
    };
  }

  return {
    authenticated: Boolean(rawSession.authenticated),
    role: effectiveRole,
    username: rawSession.username || null,
    permissions,
    capabilities,
    modules,
  };
};

export default function App() {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [profile, setProfile] = useState(defaultProfile);
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(EMPTY_SESSION);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  const [offlineQueueSnapshot, setOfflineQueueSnapshot] = useState(EMPTY_OFFLINE_QUEUE_SNAPSHOT);
  const [isHydrating, setIsHydrating] = useState(true);
  const sessionRef = useRef(EMPTY_SESSION);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applyBootstrapData = useCallback((data, fallbackRole = null) => {
    if (!data || typeof data !== 'object') return;
    if (data?.csrfToken) setCsrfToken(data.csrfToken);
    if (data?.catalog) setCatalog(data.catalog);
    if (data?.profile) setProfile(normalizeProfile(data.profile));
    if (Array.isArray(data?.orders)) setOrders(data.orders);
    const normalized = normalizeSession(data?.session, fallbackRole, data);
    setSession(normalized);
    return normalized;
  }, []);

  const handleSyncedOrder = useCallback((serverOrder, queueItem) => {
    if (!serverOrder || typeof serverOrder !== 'object') return;
    const serverOrderId = String(serverOrder.id ?? '');
    const tempQueueOrderId = queueItem?.queueId ? `offline:${queueItem.queueId}` : '';

    setOrders((prev) => {
      const next = [...prev];
      if (queueItem?.opType === 'create' && tempQueueOrderId) {
        const tempIndex = next.findIndex((order) => String(order?.id) === tempQueueOrderId);
        if (tempIndex >= 0) {
          next[tempIndex] = serverOrder;
          return next;
        }
      }

      const existingIndex = next.findIndex((order) => String(order?.id) === serverOrderId);
      if (existingIndex >= 0) {
        next[existingIndex] = serverOrder;
        return next;
      }

      return [serverOrder, ...next];
    });
  }, []);

  const runOfflineSync = useCallback(async (targetSession = null) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }
    await syncSalesOfflineQueue({
      session: targetSession || sessionRef.current,
      onSyncedOrder: handleSyncedOrder,
    });
    const snapshot = await getSalesOfflineQueueSnapshot();
    setOfflineQueueSnapshot(snapshot);
  }, [handleSyncedOrder]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      try {
        const data = await api.bootstrap();
        if (cancelled) return;
        const effectiveSession = applyBootstrapData(data, null);
        writeBootstrapCache(data);
        await runOfflineSync(effectiveSession);
      } catch (error) {
        const cached = readBootstrapCache();
        if (!cancelled && cached) {
          const effectiveSession = applyBootstrapData(cached, null);
          await runOfflineSync(effectiveSession);
        }
        if (import.meta.env.DEV) console.error('Failed to load bootstrap data from backend.', error);
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, [applyBootstrapData, runOfflineSync]);

  useEffect(() => {
    let disposed = false;
    const unsubscribe = subscribeSalesOfflineQueue((snapshot) => {
      if (!disposed) {
        setOfflineQueueSnapshot(snapshot);
      }
    });

    const handleOnline = () => {
      setIsOnline(true);
      runOfflineSync().catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to sync offline queue after online event.', error);
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runOfflineSync().catch((error) => {
          if (import.meta.env.DEV) console.error('Failed to sync offline queue after visibility change.', error);
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    runOfflineSync().catch((error) => {
      if (import.meta.env.DEV) console.error('Failed to run initial offline sync.', error);
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runOfflineSync]);

  const handleLogin = async (authPayload) => {
    const role = authPayload && typeof authPayload === 'object' ? authPayload.role : authPayload;
    const username = authPayload && typeof authPayload === 'object' ? authPayload.username : null;
    setSession((prev) => {
      const normalizedUsername = String(username || prev?.username || '').trim();
      const nextRole = role || prev.role || null;
      return normalizeSession(
        {
          authenticated: true,
          role: nextRole,
          username: normalizedUsername || prev?.username || null,
        },
        nextRole,
        null,
      );
    });

    try {
      const data = await api.bootstrap();
      const effectiveSession = applyBootstrapData(data, role);
      writeBootstrapCache(data);
      await runOfflineSync(effectiveSession);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to refresh admin data after login.', error);
    }
  };

  const handleRefreshSession = async () => {
    try {
      const data = await api.bootstrap();
      const effectiveSession = applyBootstrapData(data, session?.role || null);
      writeBootstrapCache(data);
      await runOfflineSync(effectiveSession);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to refresh bootstrap data.', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to logout from backend.', error);
    } finally {
      clearBootstrapCache();
      setSession(EMPTY_SESSION);
      setOrders([]);
    }
  };

  const handleSyncNow = () => {
    runOfflineSync().catch((error) => {
      if (import.meta.env.DEV) console.error('Manual queue sync failed.', error);
    });
  };

  const handleAcceptConflict = (queueId) => {
    dropSalesOfflineOperation(queueId)
      .then(() => getSalesOfflineQueueSnapshot())
      .then((snapshot) => setOfflineQueueSnapshot(snapshot))
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to drop conflict queue item.', error);
      });
  };

  const handleRetryConflict = (queueId) => {
    retrySalesOfflineConflict(queueId)
      .then(() => runOfflineSync())
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to retry conflict queue item.', error);
      });
  };

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
          setOrders={setOrders}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefreshSession={handleRefreshSession}
        />
      </div>
    </ErrorBoundary>
  );
}
