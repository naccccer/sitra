import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import {
  CardTitle,
  CompactField,
  CompactSelect,
  CompactTextInput,
  DangerIconButton,
  DashedActionButton,
  FieldLabel,
  InputShell,
  SettingsCard,
  SettingsInlineGroup,
  SettingsSection,
} from './SettingsUiParts';

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
    <div className="grid gap-4 xl:grid-cols-2">
      <SettingsSection title="لیست اسپیسرها" badge={`${toPN(spacers.length)} مورد`}>
        <div className="space-y-3">
          {spacers.map((spacer, index) => (
            <SettingsCard key={spacer.id}>
              <SettingsInlineGroup className="items-end justify-between">
                <div className="flex flex-1 flex-wrap gap-2.5">
                  <div className="min-w-[150px] flex-1">
                    <FieldLabel>عنوان اسپیسر</FieldLabel>
                    <CompactTextInput
                      dir="rtl"
                      className="text-right"
                      value={spacer.title}
                      onChange={(event) => updateSpacer(index, { title: event.target.value })}
                    />
                  </div>

                  <CompactField>
                    <FieldLabel>واحد</FieldLabel>
                    <CompactSelect
                      value={spacer.unit || 'm_length'}
                      onChange={(event) => updateSpacer(index, { unit: event.target.value })}
                    >
                      <option value="m_length">متر طول</option>
                      <option value="m_square">مساحت</option>
                    </CompactSelect>
                  </CompactField>

                  <CompactField>
                    <FieldLabel>فی اسپیسر</FieldLabel>
                    <InputShell>
                      <PriceInput value={spacer.price} onChange={(value) => updateSpacer(index, { price: value })} />
                    </InputShell>
                  </CompactField>
                </div>

                <DangerIconButton onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, spacers: (previous.connectors?.spacers || []).filter((item) => item.id !== spacer.id) } }))}>
                  <Trash2 size={16} />
                </DangerIconButton>
              </SettingsInlineGroup>
            </SettingsCard>
          ))}

          <div className="flex justify-start">
            <DashedActionButton
              onClick={() => setDraft((previous) => ({
                ...previous,
                connectors: {
                  ...previous.connectors,
                  spacers: [...(previous.connectors?.spacers || []), { id: Date.now().toString(), title: 'اسپیسر جدید', price: 0, unit: 'm_length' }],
                },
              }))}
            >
              <Plus size={14} />
              افزودن اسپیسر
            </DashedActionButton>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="اجرت دوجداره">
        <SettingsCard className="max-w-[420px] bg-white">
          <CardTitle title="تنظیمات محاسبه اجرت" />
          <div className="flex flex-wrap gap-2.5">
            <CompactField>
              <FieldLabel>مبنای محاسبه</FieldLabel>
              <CompactSelect
                value={doubleGlazingFee.unit || 'm_square'}
                onChange={(event) => setDraft((previous) => ({
                  ...previous,
                  fees: {
                    ...previous.fees,
                    doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), unit: event.target.value },
                  },
                }))}
              >
                <option value="m_square">مساحت</option>
                <option value="m_length">متر طول</option>
                <option value="qty">عدد</option>
              </CompactSelect>
            </CompactField>

            <CompactField>
              <FieldLabel>اجرت متغیر</FieldLabel>
              <InputShell>
                <PriceInput
                  value={doubleGlazingFee.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({
                    ...previous,
                    fees: {
                      ...previous.fees,
                      doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), price: value },
                    },
                  }))}
                />
              </InputShell>
            </CompactField>

            <CompactField>
              <FieldLabel>اجرت ثابت سفارش</FieldLabel>
              <InputShell>
                <PriceInput
                  value={doubleGlazingFee.fixedOrderPrice ?? 0}
                  onChange={(value) => setDraft((previous) => ({
                    ...previous,
                    fees: {
                      ...previous.fees,
                      doubleGlazing: { ...(previous.fees?.doubleGlazing || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), fixedOrderPrice: value },
                    },
                  }))}
                />
              </InputShell>
            </CompactField>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
};
