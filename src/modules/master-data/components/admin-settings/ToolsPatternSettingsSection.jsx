import React from 'react';
import { PriceInput } from '@/components/shared/PriceInput';
import {
  CardTitle,
  CompactField,
  CompactSelect,
  FieldLabel,
  InputShell,
  SettingsCard,
  SettingsSection,
} from './SettingsUiParts';

export const ToolsPatternSettingsSection = ({ draft, setDraft }) => {
  const edgeWork = draft?.fees?.edgeWork || { unit: 'm_length', price: 0 };
  const pattern = draft?.fees?.pattern || { unit: 'order', price: 0 };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SettingsSection title="هزینه ابزار">
        <SettingsCard className="max-w-[420px]">
          <CardTitle title="تنظیمات ابزار" />
          <div className="flex flex-wrap gap-3">
            <CompactField>
              <FieldLabel>مبنای محاسبه</FieldLabel>
              <CompactSelect
                value={edgeWork.unit || 'm_length'}
                onChange={(event) => setDraft((previous) => ({
                  ...previous,
                  fees: {
                    ...previous.fees,
                    edgeWork: { ...(previous.fees?.edgeWork || { unit: 'm_length', price: 0 }), unit: event.target.value },
                  },
                }))}
              >
                <option value="m_length">متر طول</option>
                <option value="m_square">مساحت</option>
                <option value="fixed">قیمت ثابت</option>
              </CompactSelect>
            </CompactField>

            <CompactField>
              <FieldLabel>نرخ ابزار</FieldLabel>
              <InputShell>
                <PriceInput
                  value={edgeWork.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({
                    ...previous,
                    fees: {
                      ...previous.fees,
                      edgeWork: { ...(previous.fees?.edgeWork || { unit: 'm_length', price: 0 }), price: value },
                    },
                  }))}
                />
              </InputShell>
            </CompactField>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="هزینه الگوکشی">
        <SettingsCard className="max-w-[420px]">
          <CardTitle title="تنظیمات الگو" />
          <div className="flex flex-wrap gap-3">
            <CompactField>
              <FieldLabel>مبنای محاسبه</FieldLabel>
              <CompactSelect
                value={pattern.unit || 'order'}
                onChange={(event) => setDraft((previous) => ({
                  ...previous,
                  fees: {
                    ...previous.fees,
                    pattern: { ...(previous.fees?.pattern || { unit: 'order', price: 0 }), unit: event.target.value },
                  },
                }))}
              >
                <option value="order">کل سفارش</option>
                <option value="qty">به ازای هر عدد</option>
              </CompactSelect>
            </CompactField>

            <CompactField>
              <FieldLabel>مبلغ الگو</FieldLabel>
              <InputShell>
                <PriceInput
                  value={pattern.price ?? 0}
                  onChange={(value) => setDraft((previous) => ({
                    ...previous,
                    fees: {
                      ...previous.fees,
                      pattern: { ...(previous.fees?.pattern || { unit: 'order', price: 0 }), price: value },
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
