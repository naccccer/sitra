import React from 'react';
import { AdminUsersSettingsTab } from '../components/admin/AdminUsersSettingsTab';
import { AccessDenied } from '../components/shared/AccessDenied';

export const UsersPage = ({ session }) => {
  const canManageSettings = session?.role === 'admin' || session?.role === 'manager';

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای مدیریت کاربران وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AdminUsersSettingsTab session={session} />
      </div>
    </div>
  );
};
