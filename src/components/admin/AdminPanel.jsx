import React, { useState } from 'react';
import { Briefcase, Settings } from 'lucide-react';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminOrdersView } from './AdminOrdersView';

export const AdminPanel = ({ catalog, setCatalog, orders, setOrders, onEditOrder, userRole }) => {
  const [mainView, setMainView] = useState('orders'); // 'orders' | 'settings'
  const canManageSettings = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <div className="flex bg-white rounded-2xl border border-slate-200 shadow-sm p-2 gap-2 print-hide">
        <button onClick={() => setMainView('orders')} className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${mainView === 'orders' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Briefcase size={18}/> {'\u0645\u062f\u06cc\u0631\u06cc\u062a \u0633\u0641\u0627\u0631\u0634\u0627\u062a'}
        </button>
        {canManageSettings && (
          <button onClick={() => setMainView('settings')} className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${mainView === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Settings size={18}/> {'\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0633\u06cc\u0633\u062a\u0645 \u0648 \u0642\u06cc\u0645\u062a\u200c\u0647\u0627'}
          </button>
        )}
      </div>

      {mainView === 'settings' && canManageSettings && (
        <AdminSettingsView catalog={catalog} setCatalog={setCatalog} />
      )}

      {mainView === 'orders' && (
        <AdminOrdersView orders={orders} setOrders={setOrders} catalog={catalog} onEditOrder={onEditOrder} />
      )}
    </div>
  );
};
