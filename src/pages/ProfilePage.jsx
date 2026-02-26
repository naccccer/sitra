import React from 'react';
import { AdminProfileSettingsTab } from '../components/admin/AdminProfileSettingsTab';
import { AccessDenied } from '../components/shared/AccessDenied';

export const ProfilePage = ({ profile, setProfile, session }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageProfile);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای تنظیمات وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <AdminProfileSettingsTab profile={profile} setProfile={setProfile} />
      </div>
    </div>
  );
};
