import React from 'react';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { AdminSettingsView } from '@/modules/master-data/components/AdminSettingsView';

export const AdminPage = ({ catalog, setCatalog, session }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageCatalog);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای مدیریت قیمت‌ها وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <AdminSettingsView catalog={catalog} setCatalog={setCatalog} />
    </div>
  );
};
