import React from 'react';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card } from '@/components/shared/ui';
import { AdminUsersSettingsTab } from '@/modules/users-access/components/AdminUsersSettingsTab';

export const UsersPage = ({ session, onRefreshSession }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageUsers);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای مدیریت کاربران وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <Card padding="lg">
        <AdminUsersSettingsTab session={session} onRefreshSession={onRefreshSession} />
      </Card>
    </div>
  );
};
