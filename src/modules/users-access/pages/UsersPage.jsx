import React from 'react';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card, WorkspaceShellTemplate } from '@/components/shared/ui';
import { AdminUsersSettingsTab } from '@/modules/users-access/components/AdminUsersSettingsTab';

export const UsersPage = ({ session, onRefreshSession }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageUsers);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای مدیریت کاربران وجود ندارد" />;
  }

  return (
    <WorkspaceShellTemplate
<<<<<<< ours
<<<<<<< ours
=======
      showHeader={false}
>>>>>>> theirs
=======
      showHeader={false}
>>>>>>> theirs
      eyebrow="کاربران و دسترسی"
      title="مدیریت کاربران"
      description="نقش ها، وضعیت فعال سازی و مجوزهای عملیاتی با رفتار قابل پیش بینی."
    >
      <Card padding="lg">
        <AdminUsersSettingsTab session={session} onRefreshSession={onRefreshSession} />
      </Card>
    </WorkspaceShellTemplate>
  );
};
