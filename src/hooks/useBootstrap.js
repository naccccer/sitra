import { useCallback, useEffect, useRef, useState } from 'react';
import { initialCatalog } from '../data/mockData';
import { api, setCsrfToken } from '../services/api';
import { defaultProfile, normalizeProfile } from '../utils/profile';
import { clearBootstrapCache, readBootstrapCache, writeBootstrapCache } from '../services/bootstrapCache';
import { getSalesOfflineQueueSnapshot, syncSalesOfflineQueue } from '../services/salesOfflineQueue';

const EMPTY_SESSION = {
  authenticated: false,
  role: null,
  username: null,
  permissions: [],
  capabilities: {},
  modules: [],
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

/**
 * Manages bootstrap data: session, catalog, profile, orders, and offline sync execution.
 *
 * @returns {{
 *   session: object,
 *   catalog: any,
 *   profile: any,
 *   orders: any[],
 *   ordersHasMore: boolean,
 *   isHydrating: boolean,
 *   setOrders: Function,
 *   setCatalog: Function,
 *   setProfile: Function,
 *   loadMoreOrders: () => Promise<void>,
 *   runOfflineSync: (targetSession?: object|null) => Promise<void>,
 *   handleLogin: (authPayload: any) => Promise<void>,
 *   handleLogout: () => Promise<void>,
 *   handleRefreshSession: () => Promise<void>,
 * }}
 */
export function useBootstrap() {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [profile, setProfile] = useState(defaultProfile);
  const [orders, setOrders] = useState([]);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [ordersNextCursor, setOrdersNextCursor] = useState(null);
  const [session, setSession] = useState(EMPTY_SESSION);
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

    // Handle both the legacy array shape and the new paginated object shape.
    if (Array.isArray(data?.orders)) {
      setOrders(data.orders);
      setOrdersHasMore(false);
      setOrdersNextCursor(null);
    } else if (data?.orders && typeof data.orders === 'object') {
      setOrders(Array.isArray(data.orders.items) ? data.orders.items : []);
      setOrdersHasMore(Boolean(data.orders.hasMore));
      setOrdersNextCursor(data.orders.nextCursor ?? null);
    }

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
    return snapshot;
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

  const loadMoreOrders = useCallback(async () => {
    if (!ordersHasMore || !ordersNextCursor) return;
    try {
      const data = await api.fetchOrders({ cursor: ordersNextCursor });
      const newOrders = Array.isArray(data?.orders) ? data.orders : [];
      setOrders((prev) => [...prev, ...newOrders]);
      setOrdersHasMore(Boolean(data?.hasMore));
      setOrdersNextCursor(data?.nextCursor ?? null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load more orders.', error);
    }
  }, [ordersHasMore, ordersNextCursor]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to logout from backend.', error);
    } finally {
      clearBootstrapCache();
      setSession(EMPTY_SESSION);
      setOrders([]);
      setOrdersHasMore(false);
      setOrdersNextCursor(null);
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

  return {
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
  };
}
