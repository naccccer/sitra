import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import { CardTitle, DashedActionButton, SettingsCard } from './SettingsUiParts';

export const OperationsSettingsSection = ({ draft, setDraft }) => (
  <div className="space-y-4">
    <SettingsCard>
      <CardTitle
        title="مدیریت خدمات و جاساز"
        badge={`${toPN((draft.operations || []).length)} مورد`}
      />

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        {(draft.operations || []).map((operation, index) => (
          <div key={operation.id} className="grid grid-cols-[auto_110px_120px_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
            <button onClick={() => setDraft((previous) => ({ ...previous, operations: (previous.operations || []).filter((item) => item.id !== operation.id) }))} className="rounded-md p-1 text-rose-500 hover:bg-rose-50">
              <Trash2 size={14} />
            </button>

            <div className="rounded-lg border border-slate-200 bg-white">
              <PriceInput
                value={operation.price}
                onChange={(value) => {
                  const nextOperations = [...(draft.operations || [])];
                  nextOperations[index].price = value;
                  setDraft((previous) => ({ ...previous, operations: nextOperations }));
                }}
              />
            </div>

            <select
              value={operation.unit || 'qty'}
              onChange={(event) => {
                const nextOperations = [...(draft.operations || [])];
                nextOperations[index].unit = event.target.value;
                setDraft((previous) => ({ ...previous, operations: nextOperations }));
              }}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
            >
              <option value="qty">عدد</option>
              <option value="m_length">متر طول</option>
              <option value="m_square">مساحت</option>
            </select>

            <input
              type="text"
              value={operation.title}
              onChange={(event) => {
                const nextOperations = [...(draft.operations || [])];
                nextOperations[index].title = event.target.value;
                setDraft((previous) => ({ ...previous, operations: nextOperations }));
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none"
              placeholder="عنوان خدمت یا جاساز"
            />

            <input
              type="text"
              value={operation.iconFile}
              onChange={(event) => {
                const nextOperations = [...(draft.operations || [])];
                nextOperations[index].iconFile = event.target.value;
                setDraft((previous) => ({ ...previous, operations: nextOperations }));
              }}
              className="col-start-2 col-end-5 h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-[10px] outline-none"
              placeholder="نام فایل آیکن (اختیاری)"
            />
          </div>
        ))}
      </div>

      <DashedActionButton
        onClick={() => setDraft((previous) => ({ ...previous, operations: [...(previous.operations || []), { id: Date.now().toString(), title: 'خدمت جدید', price: 0, unit: 'qty', iconFile: '' }] }))}
      >
        <Plus size={14} /> افزودن خدمات و جاساز
      </DashedActionButton>
    </SettingsCard>
  </div>
);
