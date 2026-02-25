import React, { useEffect, useState } from 'react';
import { initialCatalog } from './data/mockData';
import { AppRoutes } from './routes/AppRoutes';
import { api } from './services/api';
import { defaultProfile, normalizeProfile } from './utils/profile';

const EMPTY_SESSION = {
  authenticated: false,
  role: null,
  username: null,
};

const normalizeSession = (rawSession, fallbackRole = null) => {
  if (!rawSession || typeof rawSession !== 'object') {
    return {
      ...EMPTY_SESSION,
      role: fallbackRole || null,
    };
  }

  return {
    authenticated: Boolean(rawSession.authenticated),
    role: rawSession.role || fallbackRole || null,
    username: rawSession.username || null,
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

        if (data?.catalog) {
          setCatalog(data.catalog);
        }

        if (data?.profile) {
          setProfile(normalizeProfile(data.profile));
        }

        if (Array.isArray(data?.orders)) {
          setOrders(data.orders);
        }

        setSession(normalizeSession(data?.session));
      } catch (error) {
        console.error('Failed to load bootstrap data from backend.', error);
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
      if (data?.catalog) setCatalog(data.catalog);
      if (data?.profile) setProfile(normalizeProfile(data.profile));
      if (Array.isArray(data?.orders)) setOrders(data.orders);
      setSession(normalizeSession(data?.session, role));
    } catch (error) {
      console.error('Failed to refresh admin data after login.', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Failed to logout from backend.', error);
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
  );
}
