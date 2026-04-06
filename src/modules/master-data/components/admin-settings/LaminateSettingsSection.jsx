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
      <SettingsSection title="قوانین انتخاب خودکار طلق" badge={`${toPN(rules.length)} قانون`}>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-400">
              هنوز قانونی برای انتخاب خودکار طلق ثبت نشده است.
            </div>
          ) : (
            rules.map((rule, index) => (
              <SettingsCard key={rule.id}>
                <SettingsInlineGroup className="items-end justify-between">
                  <div className="flex flex-1 flex-wrap gap-2.5">
                    <CompactField>
                      <FieldLabel>از مجموع ضخامت</FieldLabel>
                      <InputShell>
                        <PriceInput value={rule.minTotalThickness} onChange={(value) => updateRule(index, { minTotalThickness: value || 0 })} />
                      </InputShell>
                    </CompactField>

                    <CompactField>
                      <FieldLabel>تا مجموع ضخامت</FieldLabel>
                      <InputShell>
                        <PriceInput value={rule.maxTotalThickness} onChange={(value) => updateRule(index, { maxTotalThickness: value || 0 })} />
                      </InputShell>
                    </CompactField>

                    <div className="min-w-[150px] flex-1">
                      <FieldLabel>طلق پیشنهادی سیستم</FieldLabel>
                      <CompactSelect
                        value={rule.defaultInterlayerId}
                        onChange={(event) => updateRule(index, { defaultInterlayerId: event.target.value })}
                      >
                        {interlayers.map((interlayer) => (
                          <option key={interlayer.id} value={interlayer.id}>{interlayer.title}</option>
                        ))}
                      </CompactSelect>
                    </div>
                  </div>

                  <DangerIconButton onClick={() => setDraft((previous) => ({ ...previous, pvbLogic: (previous.pvbLogic || []).filter((item) => item.id !== rule.id) }))}>
                    <Trash2 size={16} />
                  </DangerIconButton>
                </SettingsInlineGroup>
              </SettingsCard>
            ))
          )}

          <div className="flex justify-start">
            <DashedActionButton
              onClick={() => setDraft((previous) => ({
                ...previous,
                pvbLogic: [...(previous.pvbLogic || []), { id: Date.now().toString(), minTotalThickness: 0, maxTotalThickness: 0, defaultInterlayerId: interlayers[0]?.id || '' }],
              }))}
            >
              <Plus size={14} />
              افزودن قانون
            </DashedActionButton>
          </div>
        </div>
      </SettingsSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsSection title="لیست طلق‌ها" badge={`${toPN(interlayers.length)} مورد`}>
          <div className="space-y-3">
            {interlayers.map((interlayer, index) => (
              <SettingsCard key={interlayer.id}>
                <SettingsInlineGroup className="items-end justify-between">
                  <div className="flex flex-1 flex-wrap gap-2.5">
                    <div className="min-w-[150px] flex-1">
                      <FieldLabel>عنوان طلق</FieldLabel>
                      <CompactTextInput
                        dir="rtl"
                        className="text-right"
                        value={interlayer.title}
                        onChange={(event) => updateInterlayer(index, { title: event.target.value })}
                      />
                    </div>

                    <CompactField>
                      <FieldLabel>فی طلق</FieldLabel>
                      <InputShell>
                        <PriceInput value={interlayer.price} onChange={(value) => updateInterlayer(index, { price: value })} />
                      </InputShell>
                    </CompactField>
                  </div>

                  <DangerIconButton onClick={() => setDraft((previous) => ({ ...previous, connectors: { ...previous.connectors, interlayers: (previous.connectors?.interlayers || []).filter((item) => item.id !== interlayer.id) } }))}>
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
                    interlayers: [...(previous.connectors?.interlayers || []), { id: Date.now().toString(), title: 'طلق جدید', price: 0, unit: 'm_square' }],
                  },
                }))}
              >
                <Plus size={14} />
                افزودن طلق
              </DashedActionButton>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="اجرت لمینت">
          <SettingsCard className="max-w-[420px] bg-white">
            <CardTitle title="تنظیمات محاسبه اجرت" />
            <div className="flex flex-wrap gap-2.5">
              <CompactField>
                <FieldLabel>مبنای محاسبه</FieldLabel>
                <CompactSelect
                  value={laminatingFee.unit || 'm_square'}
                  onChange={(event) => setDraft((previous) => ({
                    ...previous,
                    fees: {
                      ...previous.fees,
                      laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), unit: event.target.value },
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
                    value={laminatingFee.price ?? 0}
                    onChange={(value) => setDraft((previous) => ({
                      ...previous,
                      fees: {
                        ...previous.fees,
                        laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), price: value },
                      },
                    }))}
                  />
                </InputShell>
              </CompactField>

              <CompactField>
                <FieldLabel>اجرت ثابت سفارش</FieldLabel>
                <InputShell>
                  <PriceInput
                    value={laminatingFee.fixedOrderPrice ?? 0}
                    onChange={(value) => setDraft((previous) => ({
                      ...previous,
                      fees: {
                        ...previous.fees,
                        laminating: { ...(previous.fees?.laminating || { unit: 'm_square', price: 0, fixedOrderPrice: 0 }), fixedOrderPrice: value },
                      },
                    }))}
                  />
                </InputShell>
              </CompactField>
            </div>
          </SettingsCard>
        </SettingsSection>
      </div>
    </div>
  );
};
