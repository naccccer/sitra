import React from 'react';
import { CardTitle, SettingsCard } from './SettingsUiParts';
import { PriceInput } from '@/components/shared/PriceInput';

export const ToolsPatternSettingsSection = ({ draft, setDraft }) => {
  const edgeWork = draft?.fees?.edgeWork || { unit: 'm_length', price: 0 };
  const pattern = draft?.fees?.pattern || { unit: 'order', price: 0 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SettingsCard>
          <CardTitle title="هزینه ابزار" />

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مبنای محاسبه</label>
              <select
                value={edgeWork.unit || 'm_length'}
                onChange={(event) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, edgeWork: { ...(previous.fees?.edgeWork || { unit: 'm_length', price: 0 }), unit: event.target.value } } }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold"
              >
                <option value="m_length">متر طول (محیط)</option>
                <option value="m_square">مساحت (مترمربع)</option>
                <option value="fixed">قیمت ثابت</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">نرخ ابزار (تومان)</label>
              <div className="rounded-lg border border-slate-300 bg-white">
                <PriceInput
                  value={edgeWork.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, edgeWork: { ...(previous.fees?.edgeWork || { unit: 'm_length', price: 0 }), price: value } } }))}
                />
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard>
          <CardTitle title="هزینه الگوکشی" />

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مبنای محاسبه</label>
              <select
                value={pattern.unit || 'order'}
                onChange={(event) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, pattern: { ...(previous.fees?.pattern || { unit: 'order', price: 0 }), unit: event.target.value } } }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold"
              >
                <option value="order">کل سفارش (ثابت)</option>
                <option value="qty">به ازای هر عدد</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مبلغ الگو (تومان)</label>
              <div className="rounded-lg border border-slate-300 bg-white">
                <PriceInput
                  value={pattern.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, pattern: { ...(previous.fees?.pattern || { unit: 'order', price: 0 }), price: value } } }))}
                />
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};
