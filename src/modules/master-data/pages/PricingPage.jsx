import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { AdminSettingsView } from '@/modules/master-data/components/AdminSettingsView';

export const PricingPage = ({ catalog, setCatalog, session }) => {
  const navigate = useNavigate();
  const canManageSettings = Boolean(session?.capabilities?.canManageCatalog);

  if (!canManageSettings) {
    return <AccessDenied message="دسترسی کافی برای قیمت‌گذاری وجود ندارد" />;
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => navigate('/orders/new')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          <ArrowRight size={14} />
          بازگشت به ثبت سفارش
        </button>
      </div>
      <AdminSettingsView catalog={catalog} setCatalog={setCatalog} />
    </div>
  );
};
