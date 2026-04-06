import React from 'react';
import { PriceInput } from '@/components/shared/PriceInput';
import { PAYMENT_METHOD_OPTIONS, ensureBillingSettings } from '@/utils/invoice';
import {
  CardTitle,
  CompactField,
  FieldLabel,
  InputShell,
  SettingsCard,
  SettingsInlineGroup,
  SettingsSection,
  ToggleChip,
} from './SettingsUiParts';

export const BillingSettingsSection = ({ draft, setDraft }) => (
  <div className="grid gap-4 xl:grid-cols-2">
    <SettingsSection title="قوانین قیمت‌گذاری">
      <SettingsCard className="max-w-[420px]">
        <CardTitle title="کف قیمت و کنترل فروش" />
        <SettingsInlineGroup className="items-end">
          <CompactField>
            <FieldLabel>درصد کف قیمت</FieldLabel>
            <InputShell>
              <PriceInput
                value={draft.billing?.priceFloorPercent ?? 90}
                onChange={(value) => {
                  const floor = Math.max(1, Math.min(100, Number(value) || 1));
                  setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), priceFloorPercent: floor } }));
                }}
              />
            </InputShell>
          </CompactField>
        </SettingsInlineGroup>
      </SettingsCard>
    </SettingsSection>

    <SettingsSection title="مالیات و روش‌های پرداخت">
      <div className="space-y-3">
        <SettingsCard className="max-w-[420px]">
          <CardTitle title="تنظیمات مالیات" />
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(draft.billing?.taxDefaultEnabled)}
                onChange={(event) => setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), taxDefaultEnabled: event.target.checked } }))}
              />
              <ToggleChip checked={Boolean(draft.billing?.taxDefaultEnabled)}>اعمال مالیات به‌صورت پیش‌فرض</ToggleChip>
            </label>

            <CompactField>
              <FieldLabel>نرخ مالیات</FieldLabel>
              <InputShell>
                <PriceInput
                  value={draft.billing?.taxRate ?? 10}
                  onChange={(value) => {
                    const taxRate = Math.max(0, Math.min(100, Number(value) || 0));
                    setDraft((previous) => ({ ...previous, billing: { ...ensureBillingSettings(previous), taxRate } }));
                  }}
                />
              </InputShell>
            </CompactField>
          </div>
        </SettingsCard>

        <SettingsCard>
          <CardTitle title="روش‌های پرداخت فعال" />
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const currentMethods = draft.billing?.paymentMethods || ensureBillingSettings(draft).paymentMethods;
              const checked = currentMethods.includes(option.value);

              return (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    className="sr-only"
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
                  <ToggleChip checked={checked}>{option.label}</ToggleChip>
                </label>
              );
            })}
          </div>
        </SettingsCard>
      </div>
    </SettingsSection>
  </div>
);
