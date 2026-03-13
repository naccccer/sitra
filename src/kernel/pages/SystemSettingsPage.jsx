import React from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/shared/ui';
import { ModuleRegistryPanel } from '@/kernel/components/ModuleRegistryPanel';

export const SystemSettingsPage = ({ session, onRegistryUpdated }) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings);

  if (!canManageSystemSettings) {
    return <Navigate to="/management" replace />;
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Card className="mb-4" padding="md">
        <h3 className="text-sm font-black text-slate-900">مدیریت هسته سیستم</h3>
        <p className="mt-1 text-xs font-bold text-slate-500">مدیریت فعال یا غیرفعال بودن ماژول‌های اصلی ERP</p>
      </Card>
      <ModuleRegistryPanel onRegistryUpdated={onRegistryUpdated} />
    </div>
  );
};
