import { useMemo, useState } from 'react'
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { PriceInput } from '@/components/shared/PriceInput'
import { Button, Input, ModalShell, Select } from '@/components/shared/ui'
import {
  createDefaultFormulaStep,
  PAYROLL_CALC_MODES,
  PAYROLL_FORMULA_OPERAND_MODES,
  PAYROLL_RATE_MODES,
} from './payrollFormulaConfig'
import { PayrollFormulaBuilderEditor } from './PayrollFormulaBuilderEditor'
import { PayrollSectionHeader } from './PayrollSectionHeader'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'

function renderFieldGroups(groups = []) {
  return groups.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </optgroup>
  ))
}

function isFormulaCapableItem(item = {}) {
  return item?.type === 'earning' || item?.type === 'deduction'
}

export function PayrollSettingsCatalogGroup({
  canManage,
  fieldGroups = [],
  firstFieldValue = '',
  items = [],
  onAdd,
  onPatch,
  onPatchConfig,
  onRemove,
  title,
}) {
  const [formulaItemKey, setFormulaItemKey] = useState('')
  const editingItem = useMemo(
    () => items.find((item) => item.key === formulaItemKey) || null,
    [formulaItemKey, items],
  )

  const closeFormulaModal = () => setFormulaItemKey('')

  const handleCalcModeChange = (item, nextMode) => {
    if (nextMode !== PAYROLL_CALC_MODES.formula) {
      onPatchConfig(item.key, { calcMode: nextMode })
      return
    }
    const hasBaseValue = item.formulaBaseValue !== '' && item.formulaBaseValue !== null && item.formulaBaseValue !== undefined
    const hasBuilderConfig = Boolean(
      item.formulaBaseSource
      || hasBaseValue
      || (Array.isArray(item.formulaSteps) && item.formulaSteps.length > 0),
    )
    onPatchConfig(item.key, hasBuilderConfig ? { calcMode: nextMode } : {
      calcMode: nextMode,
      formulaBaseMode: PAYROLL_FORMULA_OPERAND_MODES.source,
      formulaBaseSource: firstFieldValue,
      formulaSteps: [createDefaultFormulaStep()],
    })
  }

  return (
    <PayrollSurfaceCard className="h-full space-y-2" tone="muted">
      <PayrollSectionHeader title={title} />
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(148,163,184,0.12)]">
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={item.label}
                onChange={(event) => onPatch(item.key, event.target.value)}
                placeholder="عنوان فیلد"
                className="h-9 flex-1 text-xs font-bold"
              />
              {isFormulaCapableItem(item) ? (
                <Button
                  size="icon"
                  variant={item.calcMode && item.calcMode !== PAYROLL_CALC_MODES.input ? 'primary' : 'ghost'}
                  disabled={!canManage}
                  onClick={() => setFormulaItemKey(item.key)}
                  title="تنظیم محاسبه"
                  aria-label="تنظیم محاسبه"
                  className={`h-9 w-9 shrink-0 ${item.calcMode && item.calcMode !== PAYROLL_CALC_MODES.input ? '' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                disabled={!canManage}
                onClick={() => onRemove(item.key)}
                title="حذف فیلد"
                aria-label="حذف فیلد"
                className="h-9 w-9 shrink-0 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-bold text-slate-400">
            فیلدی ثبت نشده است.
          </div>
        )}
        <Button size="sm" variant="secondary" disabled={!canManage} onClick={onAdd} className="w-full">
          <Plus className="h-3.5 w-3.5" />
          افزودن فیلد
        </Button>
      </div>

      <ModalShell
        isOpen={Boolean(editingItem)}
        onClose={closeFormulaModal}
        title={`تنظیم محاسبه ${editingItem?.label || ''}`}
        description="در حالت پیش‌فرض مقدار مستقیم است؛ فقط در صورت نیاز حالت محاسبه را تغییر دهید."
        maxWidthClass="max-w-3xl"
        closeButtonMode="icon"
      >
        {editingItem ? (
          <div className="space-y-3">
            <Select
              value={editingItem.calcMode || PAYROLL_CALC_MODES.input}
              onChange={(event) => handleCalcModeChange(editingItem, event.target.value)}
              className="h-9 text-xs"
              disabled={!canManage}
            >
              <option value={PAYROLL_CALC_MODES.input}>مقدار مستقیم</option>
              <option value={PAYROLL_CALC_MODES.rateTimesQuantity}>نرخ × تعداد</option>
              <option value={PAYROLL_CALC_MODES.formula}>فرمول انتخابی</option>
            </Select>

            {editingItem.calcMode === PAYROLL_CALC_MODES.rateTimesQuantity ? (
              <div className="space-y-2">
                <Select
                  value={editingItem.quantitySource || ''}
                  onChange={(event) => onPatchConfig(editingItem.key, { quantitySource: event.target.value })}
                  className="h-9 text-xs"
                  disabled={!canManage}
                >
                  <option value="">فیلد تعداد/ساعت</option>
                  {renderFieldGroups(fieldGroups)}
                </Select>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <Select
                    value={editingItem.rateMode || PAYROLL_RATE_MODES.fixed}
                    onChange={(event) => onPatchConfig(editingItem.key, { rateMode: event.target.value })}
                    className="h-9 text-xs"
                    disabled={!canManage}
                  >
                    <option value={PAYROLL_RATE_MODES.fixed}>نرخ ثابت</option>
                    <option value={PAYROLL_RATE_MODES.source}>نرخ از فیلد</option>
                  </Select>
                  {editingItem.rateMode === PAYROLL_RATE_MODES.source ? (
                    <Select
                      value={editingItem.rateSource || ''}
                      onChange={(event) => onPatchConfig(editingItem.key, { rateSource: event.target.value })}
                      className="h-9 text-xs"
                      disabled={!canManage}
                    >
                      <option value="">فیلد نرخ</option>
                      {renderFieldGroups(fieldGroups)}
                    </Select>
                  ) : (
                    <div className="h-9 rounded-lg border border-slate-200 bg-white px-1">
                      <PriceInput
                        value={editingItem.rateValue ?? ''}
                        onChange={(value) => onPatchConfig(editingItem.key, { rateValue: value })}
                        placeholder="نرخ ثابت"
                        className="text-slate-800"
                        disabled={!canManage}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {editingItem.calcMode === PAYROLL_CALC_MODES.formula ? (
              <PayrollFormulaBuilderEditor
                canManage={canManage}
                fieldGroups={fieldGroups}
                item={editingItem}
                onPatch={(nextPatch) => onPatchConfig(editingItem.key, nextPatch)}
              />
            ) : null}
          </div>
        ) : null}
      </ModalShell>
    </PayrollSurfaceCard>
  )
}
