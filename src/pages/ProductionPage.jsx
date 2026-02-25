import React from 'react';
import { Factory } from 'lucide-react';

export const ProductionPage = () => {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-3 inline-flex rounded-xl bg-indigo-100 p-2 text-indigo-700">
        <Factory size={18} />
      </div>
      <h2 className="text-sm font-black text-slate-800">ماژول تولید</h2>
      <p className="mt-2 text-xs font-bold text-slate-500">این بخش به عنوان اسکلت مسیر ایجاد شد و آماده توسعه جریان برنامه‌ریزی تولید است.</p>
    </div>
  );
};
