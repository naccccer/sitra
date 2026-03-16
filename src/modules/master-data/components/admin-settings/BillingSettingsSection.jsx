import React from 'react';
import { PAYMENT_METHOD_OPTIONS, ensureBillingSettings } from '@/utils/invoice';

export const BillingSettingsSection = ({ draft, setDraft }) => (
  <div className="grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="border-b pb-2 text-sm font-black text-slate-800">قوانین قیمت‌گذاری</h3>
      <div>
        <label className="mb-1 block text-[10px] font-bold text-slate-500">درصد کف قیمت نسبت به لیست قیمت</label>
        <input
          type="number"
          min="1"
          max="100"
          value={draft.billing?.priceFloorPercent ?? 90}
          onChange={(event) => {
            const floor = Math.max(1, Math.min(100, parseInt(event.target.value, 10) || 1));
            setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), priceFloorPercent: floor } }));
          }}
          className="w-full rounded border border-slate-300 bg-white p-2 text-center text-xs font-black"
          dir="ltr"
        />
      </div>
    </div>

    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="border-b pb-2 text-sm font-black text-slate-800">مالیات و روش‌های پرداخت</h3>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(draft.billing?.taxDefaultEnabled)}
          onChange={(event) => setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), taxDefaultEnabled: event.target.checked } }))}
        />
        اعمال مالیات به‌صورت پیش‌فرض
      </label>
      <div>
        <label className="mb-1 block text-[10px] font-bold text-slate-500">نرخ مالیات (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          value={draft.billing?.taxRate ?? 10}
          onChange={(event) => {
            const taxRate = Math.max(0, Math.min(100, parseInt(event.target.value, 10) || 0));
            setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), taxRate } }));
          }}
          className="w-full rounded border border-slate-300 bg-white p-2 text-center text-xs font-black"
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-2 block text-[10px] font-bold text-slate-500">روش‌های پرداخت فعال</label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHOD_OPTIONS.map((option) => {
            const currentMethods = draft.billing?.paymentMethods || ensureBillingSettings(draft).paymentMethods;
            const checked = currentMethods.includes(option.value);

            return (
              <label key={option.value} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setDraft((previous) => {
                      const billing = ensureBillingSettings(previous);
                      const methods = new Set(billing.paymentMethods || []);
                      if (event.target.checked) methods.add(option.value);
                      else methods.delete(option.value);
                      const nextMethods = Array.from(methods);
                      return {
                        ...previous,
                        billing: {
                          ...billing,
                          paymentMethods: nextMethods.length > 0 ? nextMethods : [PAYMENT_METHOD_OPTIONS[0].value],
                        },
                      };
                    });
                  }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

