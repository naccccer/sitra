import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout = ({ onLogout, profile, session, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <Sidebar
          profile={profile}
          session={session}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <Header onLogout={onLogout} />
          <main className="flex-1 px-4 py-4 lg:px-6">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};
