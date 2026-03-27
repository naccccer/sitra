import React from 'react';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card } from '@/components/shared/ui';
import { AdminProfileSettingsTab } from '@/components/admin/AdminProfileSettingsTab';

export const ProfilePage = ({ profile, setProfile, session }) => {
  const canManageSettings = Boolean(session?.capabilities?.canManageProfile);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای پروفایل کسب‌وکار وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <Card padding="md">
        <h3 className="text-sm font-black text-slate-900">پروفایل کسب‌وکار</h3>
        <p className="mt-1 text-xs font-bold text-slate-500">مدیریت هویت برند، عناوین چاپ و اطلاعات تماس</p>
      </Card>
      <Card padding="lg">
        <AdminProfileSettingsTab profile={profile} setProfile={setProfile} />
      </Card>
    </div>
  );
};
