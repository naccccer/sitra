import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const SHELL_COLLAPSE_STORAGE_KEY = 'sitra.shell.sidebar-collapsed';

const isDesktopViewport = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(min-width: 1024px)').matches
);

const readStoredCollapseState = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SHELL_COLLAPSE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const MainLayout = ({ onLogout, profile, session, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readStoredCollapseState);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    if (isDesktopViewport()) {
      setIsSidebarCollapsed((prev) => !prev);
      return;
    }
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isSidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SHELL_COLLAPSE_STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // Ignore storage failures and keep the layout interactive.
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onViewportChange = (event) => {
      if (event.matches) {
        setIsSidebarOpen(false);
      }
    };
    mediaQuery.addEventListener('change', onViewportChange);
    return () => mediaQuery.removeEventListener('change', onViewportChange);
  }, []);

  return (
    <div className="app-shell app-print-shell h-screen overflow-hidden" dir="rtl">
      <div className="app-content-wrap app-print-frame relative h-full px-0 lg:px-4 lg:py-4">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="بستن منو"
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
          />
        )}

        <Sidebar
          profile={profile}
          session={session}
          onLogout={onLogout}
          isCollapsed={isSidebarCollapsed}
          isOpen={isSidebarOpen}
          onCloseMobile={closeMobileSidebar}
          onNavigate={closeMobileSidebar}
        />

        <div className="app-print-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            session={session}
            onToggleSidebar={handleToggleSidebar}
            isSidebarCollapsed={isSidebarCollapsed}
            isSidebarOpen={isSidebarOpen}
          />
          <main className="app-print-content flex-1 overflow-y-auto px-4 pb-5 pt-2 lg:px-6 lg:pb-6">
            <div className="app-content-area">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
