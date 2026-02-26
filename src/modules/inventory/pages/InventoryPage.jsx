import React from 'react';
import { Boxes } from 'lucide-react';

export const InventoryPage = () => {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-3 inline-flex rounded-xl bg-blue-100 p-2 text-blue-700">
        <Boxes size={18} />
      </div>
      <h2 className="text-sm font-black text-slate-800">ماژول انبار</h2>
      <p className="mt-2 text-xs font-bold text-slate-500">این بخش به عنوان اسکلت مسیر ایجاد شد و آماده توسعه جزئیات انبار است.</p>
    </div>
  );
};
