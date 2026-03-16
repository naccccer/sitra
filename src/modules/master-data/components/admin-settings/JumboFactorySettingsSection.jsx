import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export const JumboFactorySettingsSection = ({ draft, setDraft }) => (
  <div className="space-y-8">
    <div>
      <h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">محدودیت ابعاد کارخانه (تولید)</h3>
      <div className="flex max-w-sm gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold text-slate-500">حداکثر عرض قابل تولید (cm)</label>
          <input
            type="number"
            value={draft.factoryLimits?.maxWidth || 0}
            onChange={(event) => setDraft((previous) => ({ ...previous, factoryLimits: { ...(previous.factoryLimits || {}), maxWidth: parseInt(event.target.value, 10) || 0 } }))}
            className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-center text-sm font-black outline-none"
            dir="ltr"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold text-slate-500">حداکثر ارتفاع قابل تولید (cm)</label>
          <input
            type="number"
            value={draft.factoryLimits?.maxHeight || 0}
            onChange={(event) => setDraft((previous) => ({ ...previous, factoryLimits: { ...(previous.factoryLimits || {}), maxHeight: parseInt(event.target.value, 10) || 0 } }))}
            className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-center text-sm font-black outline-none"
            dir="ltr"
          />
        </div>
      </div>
    </div>

    <div>
      <h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">قوانین افزایش قیمت ابعاد ویژه (جامبو)</h3>
      <div className="max-w-4xl space-y-3">
        {(draft.jumboRules || []).map((rule, index) => (
          <div key={rule.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:flex-nowrap">
            <div className="w-24">
              <label className="mb-1 block text-[10px] font-bold text-slate-500">از بُعد (cm)</label>
              <input
                type="number"
                value={rule.minDim}
                onChange={(event) => {
                  const nextRules = [...(draft.jumboRules || [])];
                  nextRules[index].minDim = parseInt(event.target.value, 10) || 0;
                  setDraft((previous) => ({ ...previous, jumboRules: nextRules }));
                }}
                className="w-full rounded border border-slate-200 bg-white p-2 text-center text-xs font-black outline-none"
                dir="ltr"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[10px] font-bold text-slate-500">تا بُعد (0=نامحدود)</label>
              <input
                type="number"
                value={rule.maxDim}
                onChange={(event) => {
                  const nextRules = [...(draft.jumboRules || [])];
                  nextRules[index].maxDim = parseInt(event.target.value, 10) || 0;
                  setDraft((previous) => ({ ...previous, jumboRules: nextRules }));
                }}
                className="w-full rounded border border-slate-200 bg-white p-2 text-center text-xs font-black outline-none"
                dir="ltr"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[10px] font-bold text-slate-500">نوع افزایش</label>
              <select
                value={rule.type || 'percentage'}
                onChange={(event) => {
                  const nextRules = [...(draft.jumboRules || [])];
                  nextRules[index].type = event.target.value;
                  setDraft((previous) => ({ ...previous, jumboRules: nextRules }));
                }}
                className="w-full rounded border border-slate-200 bg-white p-2 text-xs font-bold outline-none"
              >
                <option value="percentage">درصد (%)</option>
                <option value="fixed">مبلغ ثابت (تومان)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold text-slate-500">مقدار افزایش</label>
              <input
                type="number"
                value={rule.value || rule.addedPercentage || 0}
                onChange={(event) => {
                  const nextRules = [...(draft.jumboRules || [])];
                  nextRules[index].value = parseInt(event.target.value, 10) || 0;
                  nextRules[index].addedPercentage = nextRules[index].value;
                  setDraft((previous) => ({ ...previous, jumboRules: nextRules }));
                }}
                className="w-full rounded border border-slate-200 bg-white p-2 text-center text-xs font-black text-rose-600 outline-none"
                dir="ltr"
              />
            </div>
            <button onClick={() => setDraft((previous) => ({ ...previous, jumboRules: (previous.jumboRules || []).filter((item) => item.id !== rule.id) }))} className="mt-4 text-red-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          onClick={() => setDraft((previous) => ({ ...previous, jumboRules: [...(previous.jumboRules || []), { id: Date.now().toString(), minDim: 0, maxDim: 0, type: 'percentage', value: 0 }] }))}
          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-bold text-blue-600 hover:bg-blue-100"
        >
          <Plus size={14} /> افزودن قانون جدید
        </button>
      </div>
    </div>
  </div>
);

