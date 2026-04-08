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
    <div className="app-shell app-print-shell min-h-screen" dir="rtl">
      <a
        href="#app-workspace"
        className="focus-ring sr-only absolute right-4 top-4 z-[80] rounded-[var(--radius-lg)] bg-[rgb(var(--ui-primary))] px-4 py-2 text-sm font-black text-white focus:not-sr-only"
      >
        پرش به محتوای اصلی
      </a>

      <div
        className="app-content-wrap app-print-frame relative"
        style={{ '--shell-layout-rail-width': isSidebarCollapsed ? 'var(--shell-rail-width-collapsed)' : 'var(--shell-rail-width)' }}
      >
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

        <div className="app-shell-main app-print-main min-h-0">
          <main
            id="app-workspace"
            className="app-print-content flex-1 overflow-y-auto pb-5 lg:pb-6"
          >
            <Header
              session={session}
              onToggleSidebar={handleToggleSidebar}
              isSidebarCollapsed={isSidebarCollapsed}
              isSidebarOpen={isSidebarOpen}
            />
            <div className="app-shell-content">
              <div className="min-h-full pb-2">
                {children || <Outlet />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
