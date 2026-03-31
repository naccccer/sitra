import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import { CardTitle, DashedActionButton, SettingsCard } from './SettingsUiParts';

export const LaminateSettingsSection = ({ draft, setDraft }) => {
  const rules = Array.isArray(draft?.pvbLogic) ? draft.pvbLogic : [];
  const interlayers = Array.isArray(draft?.connectors?.interlayers) ? draft.connectors.interlayers : [];
  const laminatingFee = draft?.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 };

  const updateRule = (index, patch) => {
    setDraft((previous) => {
      const nextRules = [...(previous.pvbLogic || [])];
      nextRules[index] = { ...nextRules[index], ...patch };
      return { ...previous, pvbLogic: nextRules };
    });
  };

  const updateInterlayer = (index, patch) => {
    setDraft((previous) => {
      const nextInterlayers = [...(previous.connectors?.interlayers || [])];
      nextInterlayers[index] = { ...nextInterlayers[index], ...patch };
      return { ...previous, connectors: { ...previous.connectors, interlayers: nextInterlayers } };
    });
  };

  return (
    <div className="space-y-4">
      <SettingsCard className="mx-auto w-full max-w-[700px]">
        <CardTitle title="قوانین محاسبه خودکار طلق لمینت" badge={`${toPN(rules.length)} قانون`} />

        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={rule.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-[145px_145px_190px_36px] sm:items-end sm:justify-center">
              <div className="w-full">
                <label className="mb-1 block text-[10px] font-bold text-slate-500">از مجموع ضخامت (mm)</label>
                <input
                  type="number"
                  value={rule.minTotalThickness}
                  onChange={(event) => updateRule(index, { minTotalThickness: parseInt(event.target.value, 10) || 0 })}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-black outline-none"
                  dir="ltr"
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block text-[10px] font-bold text-slate-500">تا مجموع ضخامت (mm)</label>
                <input
                  type="number"
                  value={rule.maxTotalThickness}
                  onChange={(event) => updateRule(index, { maxTotalThickness: parseInt(event.target.value, 10) || 0 })}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-black outline-none"
                  dir="ltr"
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block text-[10px] font-bold text-slate-500">طلق پیشنهادی سیستم</label>
                <select
                  value={rule.defaultInterlayerId}
                  onChange={(event) => updateRule(index, { defaultInterlayerId: event.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-black text-indigo-700 outline-none"
                >
                  {interlayers.map((interlayer) => (
                    <option key={interlayer.id} value={interlayer.id}>{interlayer.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex h-9 items-center justify-center">
                <button
                  onClick={() => setDraft((previous) => ({ ...previous, pvbLogic: (previous.pvbLogic || []).filter((item) => item.id !== rule.id) }))}
                  className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <DashedActionButton
          tone="indigo"
          onClick={() => setDraft((previous) => ({ ...previous, pvbLogic: [...(previous.pvbLogic || []), { id: Date.now().toString(), minTotalThickness: 0, maxTotalThickness: 0, defaultInterlayerId: interlayers[0]?.id }] }))}
        >
          <Plus size={14} /> افزودن قانون طلق
        </DashedActionButton>
      </SettingsCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_390px] xl:justify-center">
        <SettingsCard className="max-w-[390px]">
          <CardTitle title="لیست طلق‌ها" badge={`${toPN(interlayers.length)} مورد`} />

          <div className="space-y-2">
            {interlayers.map((interlayer, index) => (
              <div key={interlayer.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_96px_36px] sm:items-center">
                <div className="min-w-0">
                  <input
                    type="text"
                    value={interlayer.title}
                    onChange={(event) => updateInterlayer(index, { title: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white">
                  <PriceInput value={interlayer.price} onChange={(value) => updateInterlayer(index, { price: value })} />
                </div>
                <button
                  onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, interlayers: (previous.connectors?.interlayers || []).filter((item) => item.id !== interlayer.id) } }))}
                  className="justify-self-end rounded-md p-1 text-rose-500 hover:bg-rose-50 sm:justify-self-auto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <DashedActionButton
            tone="indigo"
            onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, interlayers: [...(previous.connectors?.interlayers || []), { id: Date.now().toString(), title: 'طلق جدید', price: 0, unit: 'm_square' }] } }))}
          >
            <Plus size={14} /> افزودن طلق
          </DashedActionButton>
        </SettingsCard>

        <SettingsCard className="max-w-[390px]">
          <CardTitle title="اجرت لمینت" />

          <div className="mx-auto w-full max-w-[280px] space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مبنای محاسبه</label>
              <select
                value={laminatingFee.unit || 'm_square'}
                onChange={(event) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), unit: event.target.value } } }))}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
              >
                <option value="m_square">مساحت (مترمربع)</option>
                <option value="m_length">متر طول (محیط)</option>
                <option value="qty">عدد</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">اجرت متغیر (تومان)</label>
              <div className="rounded-lg border border-slate-300 bg-white">
                <PriceInput
                  value={laminatingFee.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), price: value } } }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">اجرت ثابت هر سفارش (تومان)</label>
              <div className="rounded-lg border border-slate-300 bg-white">
                <PriceInput
                  value={laminatingFee.fixedOrderPrice ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), fixedOrderPrice: value } } }))}
                />
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};
