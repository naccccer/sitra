export const PAYROLL_CALC_MODES = {
  input: 'input',
  rateTimesQuantity: 'rate_x_quantity',
  formula: 'formula',
}

export const PAYROLL_RATE_MODES = {
  fixed: 'fixed',
  source: 'source',
}

export const PAYROLL_FORMULA_OPERAND_MODES = {
  source: 'source',
  number: 'number',
}

export const PAYROLL_FORMULA_OPERATORS = {
  add: 'add',
  subtract: 'subtract',
  multiply: 'multiply',
  divide: 'divide',
  percentOf: 'percent_of',
}

export const PAYROLL_FORMULA_OPERATOR_OPTIONS = [
  { value: PAYROLL_FORMULA_OPERATORS.add, label: 'جمع (+)' },
  { value: PAYROLL_FORMULA_OPERATORS.subtract, label: 'تفریق (-)' },
  { value: PAYROLL_FORMULA_OPERATORS.multiply, label: 'ضرب (×)' },
  { value: PAYROLL_FORMULA_OPERATORS.divide, label: 'تقسیم (÷)' },
  { value: PAYROLL_FORMULA_OPERATORS.percentOf, label: 'درصد از' },
]

export const PAYROLL_FORMULA_MAX_STEPS = 3

export const PAYROLL_SOURCE_OPTIONS = [
  { value: 'baseSalary', label: 'حقوق پایه' },
  { value: 'workDays', label: 'کارکرد (روز)' },
  { value: 'usedLeaveDays', label: 'مرخصی استفاده شده' },
  { value: 'remainingLeaveDays', label: 'مانده مرخصی' },
  { value: 'overtimeHours', label: 'ساعت اضافه کاری' },
  { value: 'absenceHours', label: 'ساعت کسر کار' },
  { value: 'housingAllowance', label: 'حق مسکن' },
  { value: 'foodAllowance', label: 'بن خواربار' },
  { value: 'childAllowance', label: 'حق اولاد' },
  { value: 'seniorityAllowance', label: 'سنوات' },
  { value: 'bonus', label: 'پاداش' },
  { value: 'otherAdditions', label: 'سایر مزایا' },
  { value: 'insurance', label: 'بیمه' },
  { value: 'tax', label: 'مالیات' },
  { value: 'loanDeduction', label: 'وام/اقساط' },
  { value: 'advanceDeduction', label: 'علی الحساب' },
  { value: 'absenceDeduction', label: 'مبلغ کسر کار' },
  { value: 'otherDeductions', label: 'سایر کسورات' },
]

export function isFormulaCapablePayrollItem(item = {}) {
  return item?.type === 'earning' || item?.type === 'deduction'
}

function normalizeFormulaOperandMode(mode) {
  return Object.values(PAYROLL_FORMULA_OPERAND_MODES).includes(mode)
    ? mode
    : PAYROLL_FORMULA_OPERAND_MODES.source
}

function normalizeFormulaOperator(operator) {
  return Object.values(PAYROLL_FORMULA_OPERATORS).includes(operator)
    ? operator
    : PAYROLL_FORMULA_OPERATORS.add
}

function normalizeFormulaStep(step = {}) {
  return {
    operator: normalizeFormulaOperator(String(step.operator || '').trim()),
    operandMode: normalizeFormulaOperandMode(String(step.operandMode || '').trim()),
    operandSource: String(step.operandSource || '').trim(),
    operandValue: step.operandValue ?? '',
  }
}

export function createDefaultFormulaStep() {
  return normalizeFormulaStep({
    operator: PAYROLL_FORMULA_OPERATORS.add,
    operandMode: PAYROLL_FORMULA_OPERAND_MODES.source,
    operandSource: '',
    operandValue: '',
  })
}

export function normalizePayrollItemFormula(item = {}) {
  const calcMode = isFormulaCapablePayrollItem(item)
    ? String(item.calcMode || PAYROLL_CALC_MODES.input).trim()
    : PAYROLL_CALC_MODES.input
  const normalizedCalcMode = Object.values(PAYROLL_CALC_MODES).includes(calcMode)
    ? calcMode
    : PAYROLL_CALC_MODES.input
  const rateMode = String(item.rateMode || PAYROLL_RATE_MODES.fixed).trim()
  const normalizedRateMode = Object.values(PAYROLL_RATE_MODES).includes(rateMode)
    ? rateMode
    : PAYROLL_RATE_MODES.fixed

  return {
    calcMode: normalizedCalcMode,
    quantitySource: String(item.quantitySource || '').trim(),
    rateMode: normalizedRateMode,
    rateSource: String(item.rateSource || '').trim(),
    rateValue: item.rateValue ?? '',
    formulaBaseMode: normalizeFormulaOperandMode(String(item.formulaBaseMode || '').trim()),
    formulaBaseSource: String(item.formulaBaseSource || '').trim(),
    formulaBaseValue: item.formulaBaseValue ?? '',
    formulaSteps: Array.isArray(item.formulaSteps)
      ? item.formulaSteps.slice(0, PAYROLL_FORMULA_MAX_STEPS).map((step) => normalizeFormulaStep(step))
      : [],
    expression: String(item.expression || '').trim(),
  }
}

function sanitizeExpressionSource(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '')
}

function buildFixedNumberExpression(value) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? String(numberValue) : '0'
}

function buildFormulaOperandExpression(mode, sourceValue, numericValue) {
  if (mode === PAYROLL_FORMULA_OPERAND_MODES.number) {
    return buildFixedNumberExpression(numericValue)
  }
  const normalizedSource = sanitizeExpressionSource(sourceValue)
  return normalizedSource || ''
}

function applyFormulaOperator(leftExpression, operator, rightExpression) {
  if (!leftExpression || !rightExpression) return leftExpression
  if (operator === PAYROLL_FORMULA_OPERATORS.add) return `(${leftExpression} + ${rightExpression})`
  if (operator === PAYROLL_FORMULA_OPERATORS.subtract) return `(${leftExpression} - ${rightExpression})`
  if (operator === PAYROLL_FORMULA_OPERATORS.multiply) return `(${leftExpression} * ${rightExpression})`
  if (operator === PAYROLL_FORMULA_OPERATORS.divide) return `(${leftExpression} / ${rightExpression})`
  if (operator === PAYROLL_FORMULA_OPERATORS.percentOf) return `((${leftExpression}) * (${rightExpression}) / 100)`
  return leftExpression
}

export function buildPayrollItemExpression(item = {}) {
  const formula = normalizePayrollItemFormula(item)
  if (!isFormulaCapablePayrollItem(item)) {
    return ''
  }
  if (formula.calcMode === PAYROLL_CALC_MODES.formula) {
    const baseExpression = buildFormulaOperandExpression(
      formula.formulaBaseMode,
      formula.formulaBaseSource,
      formula.formulaBaseValue,
    )
    if (!baseExpression) {
      return formula.expression
    }
    const expressionFromSteps = (Array.isArray(formula.formulaSteps) ? formula.formulaSteps : [])
      .reduce((currentExpression, step) => {
        const normalizedStep = normalizeFormulaStep(step)
        const rightExpression = buildFormulaOperandExpression(
          normalizedStep.operandMode,
          normalizedStep.operandSource,
          normalizedStep.operandValue,
        )
        return applyFormulaOperator(currentExpression, normalizedStep.operator, rightExpression)
      }, baseExpression)
    return expressionFromSteps || formula.expression
  }
  if (formula.calcMode !== PAYROLL_CALC_MODES.rateTimesQuantity) {
    return ''
  }

  const quantitySource = sanitizeExpressionSource(formula.quantitySource)
  if (!quantitySource) {
    return ''
  }

  if (formula.rateMode === PAYROLL_RATE_MODES.source) {
    const rateSource = sanitizeExpressionSource(formula.rateSource)
    return rateSource ? `${quantitySource} * ${rateSource}` : ''
  }

  return `${quantitySource} * ${buildFixedNumberExpression(formula.rateValue)}`
}
