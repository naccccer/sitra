import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import { CardTitle, DashedActionButton, SettingsCard } from './SettingsUiParts';

export const DoubleGlazingSettingsSection = ({ draft, setDraft }) => {
  const spacers = Array.isArray(draft?.connectors?.spacers) ? draft.connectors.spacers : [];
  const doubleGlazingFee = draft?.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 };

  const updateSpacer = (index, patch) => {
    setDraft((previous) => {
      const nextSpacers = [...(previous.connectors?.spacers || [])];
      nextSpacers[index] = { ...nextSpacers[index], ...patch };
      return { ...previous, connectors: { ...previous.connectors, spacers: nextSpacers } };
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_390px] xl:justify-center">
        <SettingsCard className="max-w-[390px]">
          <CardTitle title="لیست اسپیسرها" badge={`${toPN(spacers.length)} مورد`} />

          <div className="space-y-2">
            {spacers.map((spacer, index) => (
              <div key={spacer.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_84px_96px_36px] sm:items-center">
                <div className="min-w-0">
                  <input
                    type="text"
                    value={spacer.title}
                    onChange={(event) => updateSpacer(index, { title: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
                  />
                </div>

                <select
                  value={spacer.unit || 'm_length'}
                  onChange={(event) => updateSpacer(index, { unit: event.target.value })}
                  className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-1.5 text-xs font-bold outline-none"
                >
                  <option value="m_length">متر طول</option>
                  <option value="m_square">مساحت</option>
                </select>

                <div className="rounded-lg border border-slate-200 bg-white">
                  <PriceInput value={spacer.price} onChange={(value) => updateSpacer(index, { price: value })} />
                </div>

                <button
                  onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, spacers: (previous.connectors?.spacers || []).filter((item) => item.id !== spacer.id) } }))}
                  className="justify-self-end rounded-md p-1 text-rose-500 hover:bg-rose-50 sm:justify-self-auto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <DashedActionButton
            onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, spacers: [...(previous.connectors?.spacers || []), { id: Date.now().toString(), title: 'اسپیسر جدید', price: 0, unit: 'm_length' }] } }))}
          >
            <Plus size={14} /> افزودن اسپیسر
          </DashedActionButton>
        </SettingsCard>

        <SettingsCard className="max-w-[390px]">
          <CardTitle title="اجرت دوجداره" />

          <div className="mx-auto w-full max-w-[280px] space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مبنای محاسبه</label>
              <select
                value={doubleGlazingFee.unit || 'm_square'}
                onChange={(event) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), unit: event.target.value } } }))}
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
                  value={doubleGlazingFee.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), price: value } } }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500">اجرت ثابت هر سفارش (تومان)</label>
              <div className="rounded-lg border border-slate-300 bg-white">
                <PriceInput
                  value={doubleGlazingFee.fixedOrderPrice ?? 0}
                  onChange={(value) => setDraft((previous) => ({ ...previous, fees: { ...previous.fees, doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), fixedOrderPrice: value } } }))}
                />
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};
