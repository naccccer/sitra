import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { createEmptyJumboRule, normalizeJumboRules } from '@/utils/catalogPricing';
import { normalizeDigitsToLatin } from '@/utils/helpers';
import {
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

const formatDecimalValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(numeric);
};

const parseDecimalValue = (value) => {
  const normalized = normalizeDigitsToLatin(value)
    .replace(/[,\u066C\u060C\s]/g, '')
    .replace(/[٫،]/g, '.')
    .replace(/[^0-9.]/g, '');

  if (normalized === '') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const FormattedDecimalInput = ({ value, onChange }) => (
  <CompactTextInput
    type="text"
    inputMode="decimal"
    dir="ltr"
    value={formatDecimalValue(value)}
    onChange={(event) => onChange(parseDecimalValue(event.target.value))}
  />
);

const updateJumboRules = (setDraft, updater) => {
  setDraft((previous) => ({
    ...previous,
    jumboRules: normalizeJumboRules(updater(previous.jumboRules || [])),
  }));
};

const updateFactoryLimits = (setDraft, patch) => {
  setDraft((previous) => ({
    ...previous,
    factoryLimits: {
      ...(previous.factoryLimits || {}),
      ...patch,
    },
  }));
};

export const JumboFactorySettingsSection = ({ draft, setDraft }) => (
  <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-2">
      <SettingsSection title="محدودیت ابعاد کارخانه">
        <SettingsCard className="bg-white">
          <SettingsInlineGroup>
            <CompactField>
              <FieldLabel>حداکثر عرض</FieldLabel>
              <InputShell>
                <PriceInput value={draft.factoryLimits?.maxShortSideCm ?? 0} onChange={(value) => updateFactoryLimits(setDraft, { maxShortSideCm: value || 0 })} />
              </InputShell>
            </CompactField>

            <CompactField>
              <FieldLabel>حداکثر طول</FieldLabel>
              <InputShell>
                <PriceInput value={draft.factoryLimits?.maxLongSideCm ?? 0} onChange={(value) => updateFactoryLimits(setDraft, { maxLongSideCm: value || 0 })} />
              </InputShell>
            </CompactField>
          </SettingsInlineGroup>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="حداقل متراژ قابل محاسبه">
        <SettingsCard className="bg-white">
          <SettingsInlineGroup>
            <CompactField>
              <FieldLabel>اگر مساحت کمتر از</FieldLabel>
              <FormattedDecimalInput
                value={draft.factoryLimits?.minimumChargeThresholdM2 ?? 1}
                onChange={(value) => updateFactoryLimits(setDraft, { minimumChargeThresholdM2: value })}
              />
            </CompactField>

            <CompactField>
              <FieldLabel>برای قیمت‌گذاری حساب شود</FieldLabel>
              <FormattedDecimalInput
                value={draft.factoryLimits?.minimumBillableAreaM2 ?? 1}
                onChange={(value) => updateFactoryLimits(setDraft, { minimumBillableAreaM2: value })}
              />
            </CompactField>
          </SettingsInlineGroup>
        </SettingsCard>
      </SettingsSection>
    </div>

    <SettingsSection title="مرحله‌های افزایش قیمت ابعاد ویژه">
      <div className="space-y-3">
        {(draft.jumboRules || []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-400">
            هنوز مرحله‌ای برای جامبو ثبت نشده است.
          </div>
        ) : (
          (draft.jumboRules || []).map((rule, index) => (
            <SettingsCard key={rule.id} className="bg-white">
              <SettingsInlineGroup className="items-end justify-between">
                <div className="flex flex-1 flex-wrap gap-2.5">
                  <div className="min-w-[150px] flex-1">
                    <FieldLabel>عنوان مرحله</FieldLabel>
                    <CompactTextInput
                      dir="rtl"
                      className="text-right"
                      value={rule.title || ''}
                      onChange={(event) => updateJumboRules(setDraft, (rules) => {
                        const nextRules = [...rules];
                        nextRules[index] = { ...nextRules[index], title: event.target.value };
                        return nextRules;
                      })}
                    />
                  </div>

                  <CompactField>
                    <FieldLabel>اگر عرض بیشتر از</FieldLabel>
                    <InputShell>
                      <PriceInput
                        value={rule.shortSideOverCm ?? 0}
                        onChange={(value) => updateJumboRules(setDraft, (rules) => {
                          const nextRules = [...rules];
                          nextRules[index] = { ...nextRules[index], shortSideOverCm: value || 0 };
                          return nextRules;
                        })}
                      />
                    </InputShell>
                  </CompactField>

                  <CompactField>
                    <FieldLabel>یا طول بیشتر از</FieldLabel>
                    <InputShell>
                      <PriceInput
                        value={rule.longSideOverCm ?? 0}
                        onChange={(value) => updateJumboRules(setDraft, (rules) => {
                          const nextRules = [...rules];
                          nextRules[index] = { ...nextRules[index], longSideOverCm: value || 0 };
                          return nextRules;
                        })}
                      />
                    </InputShell>
                  </CompactField>

                  <CompactField>
                    <FieldLabel>نوع افزایش</FieldLabel>
                    <CompactSelect
                      value={rule.adjustmentType || 'percentage'}
                      onChange={(event) => updateJumboRules(setDraft, (rules) => {
                        const nextRules = [...rules];
                        nextRules[index] = { ...nextRules[index], adjustmentType: event.target.value };
                        return nextRules;
                      })}
                    >
                      <option value="percentage">درصد (%)</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </CompactSelect>
                  </CompactField>

                  <CompactField>
                    <FieldLabel>مقدار افزایش</FieldLabel>
                    <InputShell>
                      <PriceInput
                        value={rule.adjustmentValue ?? 0}
                        onChange={(value) => updateJumboRules(setDraft, (rules) => {
                          const nextRules = [...rules];
                          nextRules[index] = { ...nextRules[index], adjustmentValue: Number(value) || 0 };
                          return nextRules;
                        })}
                      />
                    </InputShell>
                  </CompactField>
                </div>

                <DangerIconButton onClick={() => updateJumboRules(setDraft, (rules) => rules.filter((item) => item.id !== rule.id))}>
                  <Trash2 size={16} />
                </DangerIconButton>
              </SettingsInlineGroup>
            </SettingsCard>
          ))
        )}

        <div className="flex justify-start">
          <DashedActionButton onClick={() => updateJumboRules(setDraft, (rules) => [...rules, createEmptyJumboRule(rules.length)])}>
            <Plus size={14} />
            افزودن مرحله
          </DashedActionButton>
        </div>
      </div>
    </SettingsSection>
  </div>
);
