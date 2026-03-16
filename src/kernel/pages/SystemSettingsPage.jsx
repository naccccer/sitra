import React from 'react';
import { Navigate } from 'react-router-dom';
import { ModuleRegistryPanel } from '@/kernel/components/ModuleRegistryPanel';

export const SystemSettingsPage = ({ session, onRegistryUpdated }) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings);

  if (!canManageSystemSettings) {
    return <Navigate to="/management" replace />;
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <ModuleRegistryPanel onRegistryUpdated={onRegistryUpdated} />
    </div>
  );
};
