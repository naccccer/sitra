import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const isDesktopViewport = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(min-width: 1024px)').matches
);

export const MainLayout = ({ onLogout, profile, session, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    <div className="app-shell h-screen overflow-hidden">
      <div className="app-content-wrap relative h-full">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="بستن منو"
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header session={session} onToggleSidebar={handleToggleSidebar} />
          <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-6">
            <div className="app-content-area">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
