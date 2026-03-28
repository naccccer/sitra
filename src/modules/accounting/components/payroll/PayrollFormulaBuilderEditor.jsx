import { Plus, Trash2 } from 'lucide-react'
import { PriceInput } from '@/components/shared/PriceInput'
import { Button, Select } from '@/components/shared/ui'
import {
  createDefaultFormulaStep,
  PAYROLL_FORMULA_MAX_STEPS,
  PAYROLL_FORMULA_OPERAND_MODES,
  PAYROLL_FORMULA_OPERATORS,
  PAYROLL_FORMULA_OPERATOR_OPTIONS,
} from './payrollFormulaConfig'

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

function resolveFirstFieldValue(groups = []) {
  for (const group of groups) {
    for (const option of group.options || []) {
      if (option.value) return option.value
    }
  }
  return ''
}

function SourceOrNumberInput({
  canManage,
  fieldGroups,
  mode,
  numberValue,
  onModeChange,
  onNumberChange,
  onSourceChange,
  sourceValue,
}) {
  return (
    <>
      <Select value={mode} onChange={(event) => onModeChange(event.target.value)} className="h-9 text-xs" disabled={!canManage}>
        <option value={PAYROLL_FORMULA_OPERAND_MODES.source}>فیلد</option>
        <option value={PAYROLL_FORMULA_OPERAND_MODES.number}>عدد</option>
      </Select>
      {mode === PAYROLL_FORMULA_OPERAND_MODES.source ? (
        <Select value={sourceValue || ''} onChange={(event) => onSourceChange(event.target.value)} className="h-9 text-xs" disabled={!canManage}>
          <option value="">انتخاب فیلد</option>
          {renderFieldGroups(fieldGroups)}
        </Select>
      ) : (
        <div className="h-9 rounded-lg border border-slate-200 bg-white px-1">
          <PriceInput value={numberValue ?? ''} onChange={onNumberChange} placeholder="عدد" className="text-slate-800" disabled={!canManage} />
        </div>
      )}
    </>
  )
}

export function PayrollFormulaBuilderEditor({ canManage, fieldGroups = [], item, onPatch }) {
  const steps = Array.isArray(item.formulaSteps) ? item.formulaSteps : []
  const firstFieldValue = resolveFirstFieldValue(fieldGroups)

  const patchStep = (stepIndex, nextPatch) => {
    const nextSteps = [...steps]
    nextSteps[stepIndex] = { ...(nextSteps[stepIndex] || createDefaultFormulaStep()), ...nextPatch }
    onPatch({ formulaSteps: nextSteps })
  }

  const removeStep = (stepIndex) => {
    onPatch({ formulaSteps: steps.filter((_, index) => index !== stepIndex) })
  }

  const addStep = () => {
    if (steps.length >= PAYROLL_FORMULA_MAX_STEPS) return
    onPatch({ formulaSteps: [...steps, createDefaultFormulaStep()] })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="text-[11px] font-bold text-slate-500">فرمول انتخابی</div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[96px_1fr]">
        <SourceOrNumberInput
          canManage={canManage}
          fieldGroups={fieldGroups}
          mode={item.formulaBaseMode || PAYROLL_FORMULA_OPERAND_MODES.source}
          numberValue={item.formulaBaseValue ?? ''}
          onModeChange={(nextMode) => onPatch({
            formulaBaseMode: nextMode,
            formulaBaseSource: nextMode === PAYROLL_FORMULA_OPERAND_MODES.source
              ? (item.formulaBaseSource || firstFieldValue)
              : item.formulaBaseSource,
          })}
          onNumberChange={(value) => onPatch({ formulaBaseValue: value })}
          onSourceChange={(value) => onPatch({ formulaBaseSource: value })}
          sourceValue={item.formulaBaseSource || ''}
        />
      </div>

      <div className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <div key={`${item.key}-step-${index + 1}`} className="grid gap-2 sm:grid-cols-[120px_96px_1fr_auto]">
            <Select
              value={step.operator || PAYROLL_FORMULA_OPERATORS.add}
              onChange={(event) => patchStep(index, { operator: event.target.value })}
              className="h-9 text-xs"
              disabled={!canManage}
            >
              {PAYROLL_FORMULA_OPERATOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <SourceOrNumberInput
              canManage={canManage}
              fieldGroups={fieldGroups}
              mode={step.operandMode || PAYROLL_FORMULA_OPERAND_MODES.source}
              numberValue={step.operandValue ?? ''}
              onModeChange={(nextMode) => patchStep(index, {
                operandMode: nextMode,
                operandSource: nextMode === PAYROLL_FORMULA_OPERAND_MODES.source
                  ? (step.operandSource || firstFieldValue)
                  : step.operandSource,
              })}
              onNumberChange={(value) => patchStep(index, { operandValue: value })}
              onSourceChange={(value) => patchStep(index, { operandSource: value })}
              sourceValue={step.operandSource || ''}
            />

            <Button
              size="icon"
              variant="ghost"
              disabled={!canManage}
              onClick={() => removeStep(index)}
              title="حذف مرحله"
              aria-label="حذف مرحله"
              className="h-9 w-9 shrink-0 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!canManage || steps.length >= PAYROLL_FORMULA_MAX_STEPS}
          onClick={addStep}
          className="text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن مرحله
        </Button>
        <div className="text-[11px] font-bold text-slate-400">
          حداکثر {PAYROLL_FORMULA_MAX_STEPS} مرحله
        </div>
      </div>
    </div>
  )
}
