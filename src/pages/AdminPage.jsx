import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AdminSettingsView } from '../components/admin/AdminSettingsView';

export const AdminPage = ({ catalog, setCatalog, session }) => {
  const canManageSettings = session?.role === 'admin' || session?.role === 'manager';

  if (!canManageSettings) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
        <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-2 text-amber-700">
          <ShieldAlert size={18} />
        </div>
        <h2 className="text-sm font-black text-amber-900">دسترسی کافی برای تنظیمات وجود ندارد</h2>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <AdminSettingsView
        catalog={catalog}
        setCatalog={setCatalog}
      />
    </div>
  );
};
