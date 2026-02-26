import React from 'react';
import { AccessDenied } from '../../../components/shared/AccessDenied';
import { AdminUsersSettingsTab } from '../components/AdminUsersSettingsTab';

export const UsersPage = ({ session }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageUsers);

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
