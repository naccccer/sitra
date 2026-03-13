import React from 'react';
import { Phone, Save, User } from 'lucide-react';

export const CheckoutModal = ({
  isOpen,
  editingOrder,
  customerInfo,
  onCustomerInfoChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="print-hide fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-emerald-500 p-5 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <User size={32} />
          </div>
          <h3 className="text-lg font-black">{editingOrder ? 'تایید نهایی ویرایش' : 'اطلاعات سفارش‌دهنده'}</h3>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500"><User size={14} /> نام و نام خانوادگی / شرکت</label>
            <input type="text" value={customerInfo.name} onChange={(event) => onCustomerInfoChange('name', event.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 text-sm font-black outline-none transition-colors focus:border-emerald-400" placeholder="مثال: علی حسینی" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500"><Phone size={14} /> شماره موبایل</label>
            <input type="tel" value={customerInfo.phone} onChange={(event) => onCustomerInfoChange('phone', event.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 text-sm font-black outline-none transition-colors focus:border-emerald-400" placeholder="09123456789" dir="ltr" />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-3.5 font-black text-slate-600 transition-colors hover:bg-slate-200">انصراف</button>
            <button onClick={onSubmit} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600">
              <Save size={18} />
              ثبت نهایی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
