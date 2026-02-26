import React, { useEffect, useState } from 'react';
import { initialCatalog } from './data/mockData';
import { AppRoutes } from './routes/AppRoutes';
import { api, setCsrfToken } from './services/api';
import { defaultProfile, normalizeProfile } from './utils/profile';

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

const deriveCapabilitiesFromRole = (role) => {
  const normalizedRole = String(role || '').trim();
  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: true,
      canManageUsers: true,
      canUseProduction: true,
      canUseInventory: true,
      canManageProfile: true,
    };
  }

  if (normalizedRole === 'sales') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: false,
      canManageUsers: false,
      canUseProduction: false,
      canUseInventory: false,
      canManageProfile: false,
    };
  }

  if (normalizedRole === 'production') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: false,
      canManageUsers: false,
      canUseProduction: true,
      canUseInventory: false,
      canManageProfile: false,
    };
  }

  if (normalizedRole === 'inventory') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCatalog: false,
      canManageUsers: false,
      canUseProduction: false,
      canUseInventory: true,
      canManageProfile: false,
    };
  }

  return {
    canAccessDashboard: false,
    canManageOrders: false,
    canManageCatalog: false,
    canManageUsers: false,
    canUseProduction: false,
    canUseInventory: false,
    canManageProfile: false,
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
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      try {
        const data = await api.bootstrap();
        if (cancelled) return;

        if (data?.csrfToken) {
          setCsrfToken(data.csrfToken);
        }

        if (data?.catalog) {
          setCatalog(data.catalog);
        }

        if (data?.profile) {
          setProfile(normalizeProfile(data.profile));
        }

        if (Array.isArray(data?.orders)) {
          setOrders(data.orders);
        }

        setSession(normalizeSession(data?.session, null, data));
      } catch (error) {
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
  }, []);

  const handleLogin = async (role) => {
    setSession((prev) => ({
      ...prev,
      authenticated: true,
      role: role || prev.role || 'manager',
    }));

    try {
      const data = await api.bootstrap();
      if (data?.csrfToken) setCsrfToken(data.csrfToken);
      if (data?.catalog) setCatalog(data.catalog);
      if (data?.profile) setProfile(normalizeProfile(data.profile));
      if (Array.isArray(data?.orders)) setOrders(data.orders);
      setSession(normalizeSession(data?.session, role, data));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to refresh admin data after login.', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to logout from backend.', error);
    } finally {
      setSession(EMPTY_SESSION);
      setOrders([]);
    }
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
        />
      </div>
    </ErrorBoundary>
  );
}
