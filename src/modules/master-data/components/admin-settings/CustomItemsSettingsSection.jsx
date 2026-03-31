import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { CUSTOM_UNIT_LABEL_M_SQUARE, CUSTOM_UNIT_OPTIONS, normalizeCustomUnitLabel } from '@/utils/customItemUnits';
import { toPN } from '@/utils/helpers';
import { CardTitle, DashedActionButton, SettingsCard } from './SettingsUiParts';

const createCustomItem = () => ({
  id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: 'آیتم سفارشی جدید',
  unitLabel: CUSTOM_UNIT_LABEL_M_SQUARE,
  unitPrice: 0,
  isActive: true,
});

const updateItemAt = (items, index, patch) => items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));

export const CustomItemsSettingsSection = ({ draft, setDraft }) => {
  const items = Array.isArray(draft.customItems) ? draft.customItems : [];

  return (
    <div className="space-y-4">
      <SettingsCard>
        <CardTitle title="مدیریت آیتم‌های سفارشی" badge={`${toPN(items.length)} مورد`} />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 p-2 text-center font-black">حذف نرم</th>
                  <th className="border-b border-slate-200 p-2 font-black">عنوان آیتم</th>
                  <th className="border-b border-slate-200 p-2 font-black">واحد</th>
                  <th className="border-b border-slate-200 p-2 text-left font-black">قیمت واحد (تومان)</th>
                  <th className="border-b border-slate-200 p-2 text-center font-black">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs font-bold text-slate-400">هنوز آیتم سفارشی ثبت نشده است.</td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className={`transition-colors hover:bg-slate-50 ${item.isActive ? '' : 'bg-slate-50/70'}`}>
                      <td className="border-b border-slate-100 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = updateItemAt(items, index, { isActive: false });
                            setDraft((previous) => ({ ...previous, customItems: next }));
                          }}
                          className="inline-flex rounded-md p-1 text-rose-500 hover:bg-rose-50"
                          title="غیرفعال‌سازی"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      <td className="border-b border-slate-100 p-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(event) => {
                            const next = updateItemAt(items, index, { title: event.target.value });
                            setDraft((previous) => ({ ...previous, customItems: next }));
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
                          placeholder="عنوان آیتم سفارشی"
                        />
                      </td>
                      <td className="border-b border-slate-100 p-2">
                        <select
                          value={normalizeCustomUnitLabel(item.unitLabel)}
                          onChange={(event) => {
                            const next = updateItemAt(items, index, { unitLabel: normalizeCustomUnitLabel(event.target.value) });
                            setDraft((previous) => ({ ...previous, customItems: next }));
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
                        >
                          {CUSTOM_UNIT_OPTIONS.map((option) => (
                            <option key={option.code} value={option.label}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 p-2 text-left">
                        <div className="rounded-lg border border-slate-200 bg-white">
                          <PriceInput
                            value={item.unitPrice}
                            onChange={(value) => {
                              const next = updateItemAt(items, index, { unitPrice: Math.max(0, Number(value) || 0) });
                              setDraft((previous) => ({ ...previous, customItems: next }));
                            }}
                          />
                        </div>
                      </td>
                      <td className="border-b border-slate-100 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = updateItemAt(items, index, { isActive: !item.isActive });
                            setDraft((previous) => ({ ...previous, customItems: next }));
                          }}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                        >
                          {item.isActive ? 'فعال' : 'غیرفعال'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DashedActionButton
          onClick={() => setDraft((previous) => ({ ...previous, customItems: [...(previous.customItems || []), createCustomItem()] }))}
        >
          <Plus size={14} /> افزودن آیتم سفارشی
        </DashedActionButton>
      </SettingsCard>
    </div>
  );
};
