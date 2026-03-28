import { buildPayrollItemExpression, isFormulaCapablePayrollItem, normalizePayrollItemFormula } from './payrollFormulaConfig'

const DEFAULT_WORK_ITEMS = [
  { key: 'workDays', label: 'کارکرد (روز)', type: 'work', sortOrder: 10, active: true },
  { key: 'usedLeaveDays', label: 'مرخصی استفاده شده', type: 'work', sortOrder: 20, active: true },
  { key: 'remainingLeaveDays', label: 'مانده مرخصی', type: 'work', sortOrder: 30, active: true },
  { key: 'overtimeHours', label: 'ساعت اضافه کاری', type: 'work', sortOrder: 40, active: true },
  { key: 'absenceHours', label: 'ساعت کسر کار', type: 'work', sortOrder: 50, active: true },
]

const DEFAULT_EARNING_ITEMS = [
  { key: 'baseSalary', label: 'حقوق پایه', type: 'earning', source: 'baseSalary', sortOrder: 100, active: true },
  { key: 'housingAllowance', label: 'حق مسکن', type: 'earning', source: 'housingAllowance', sortOrder: 110, active: true },
  { key: 'foodAllowance', label: 'بن خواربار', type: 'earning', source: 'foodAllowance', sortOrder: 120, active: true },
  { key: 'childAllowance', label: 'حق اولاد', type: 'earning', source: 'childAllowance', sortOrder: 130, active: true },
  { key: 'seniorityAllowance', label: 'سنوات', type: 'earning', source: 'seniorityAllowance', sortOrder: 140, active: true },
  { key: 'overtimePay', label: 'مبلغ اضافه کاری', type: 'earning', source: 'overtimePay', sortOrder: 150, active: true },
  { key: 'bonus', label: 'پاداش', type: 'earning', source: 'bonus', sortOrder: 160, active: true },
  { key: 'otherAdditions', label: 'سایر مزایا', type: 'earning', source: 'otherAdditions', sortOrder: 170, active: true },
]

const DEFAULT_DEDUCTION_ITEMS = [
  { key: 'insurance', label: 'بیمه', type: 'deduction', source: 'insurance', sortOrder: 200, active: true },
  { key: 'tax', label: 'مالیات', type: 'deduction', source: 'tax', sortOrder: 210, active: true },
  { key: 'loanDeduction', label: 'وام/اقساط', type: 'deduction', source: 'loanDeduction', sortOrder: 220, active: true },
  { key: 'advanceDeduction', label: 'علی الحساب', type: 'deduction', source: 'advanceDeduction', sortOrder: 230, active: true },
  { key: 'absenceDeduction', label: 'مبلغ کسر کار', type: 'deduction', source: 'absenceDeduction', sortOrder: 240, active: true },
  { key: 'otherDeductions', label: 'سایر کسورات', type: 'deduction', source: 'otherDeductions', sortOrder: 250, active: true },
]

export const DEFAULT_PAYROLL_ITEM_CATALOG = [
  ...DEFAULT_WORK_ITEMS,
  ...DEFAULT_EARNING_ITEMS,
  ...DEFAULT_DEDUCTION_ITEMS,
]

export function normalizeCatalogItem(item = {}, index = 0) {
  const key = String(item.key || '').trim()
  const label = String(item.label || key || `field_${index + 1}`).trim()
  const type = String(item.type || '').trim()
  const normalizedType = ['earning', 'deduction', 'work', 'info'].includes(type) ? type : 'info'
  return {
    key,
    label,
    type: normalizedType,
    source: String(item.source || key).trim(),
    sortOrder: Number(item.sortOrder || (index + 1) * 10) || (index + 1) * 10,
    active: item.active !== false,
    ...normalizePayrollItemFormula(item),
  }
}

export function normalizePayrollItemCatalog(value) {
  const list = Array.isArray(value) ? value : []
  const normalized = list.map((item, index) => normalizeCatalogItem(item, index)).filter((item) => item.key)
  if (normalized.length === 0) return [...DEFAULT_PAYROLL_ITEM_CATALOG]
  return normalized.sort((a, b) => a.sortOrder - b.sortOrder)
}

export function splitCatalogByType(catalog = []) {
  const safeCatalog = Array.isArray(catalog) ? catalog : []
  return {
    work: safeCatalog.filter((item) => item.active && item.type === 'work'),
    earning: safeCatalog.filter((item) => item.active && item.type === 'earning'),
    deduction: safeCatalog.filter((item) => item.active && item.type === 'deduction'),
    info: safeCatalog.filter((item) => item.active && item.type === 'info'),
  }
}

export function buildFormulaConfigFromCatalog(catalog = []) {
  const formulaItems = (Array.isArray(catalog) ? catalog : [])
    .map((item, index) => normalizeCatalogItem(item, index))
    .filter((item) => item.active && (item.type === 'earning' || item.type === 'deduction') && item.source)
    .map((item, index) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      source: item.source,
      expression: buildPayrollItemExpression(item),
      accountKey: item.key,
      sortOrder: Number(item.sortOrder || (index + 1) * 10),
    }))

  return {
    version: 1,
    items: formulaItems,
  }
}

export function resolveInputValueFromPayslip(payslip = {}, item = {}) {
  const source = String(item.source || item.key || '')
  if (!source) return ''
  if (Object.hasOwn(payslip, source)) return payslip[source]
  if (Object.hasOwn(payslip?.inputs || {}, source)) return payslip.inputs[source]
  return ''
}

function normalizeNumericContext(values = {}) {
  const context = {}
  Object.entries(values).forEach(([key, value]) => {
    const name = String(key || '').replace(/[^A-Za-z0-9_]/g, '')
    if (!name) return
    const numberValue = Number(value)
    if (Number.isFinite(numberValue)) context[name] = numberValue
  })
  return context
}

function tokenizeExpression(expression = '') {
  const tokens = []
  let offset = 0
  const source = String(expression || '')
  const pattern = /\s*(?:([0-9]+(?:\.[0-9]+)?)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/(),]))/y
  while (offset < source.length) {
    pattern.lastIndex = offset
    const match = pattern.exec(source)
    if (!match) throw new Error('Invalid payroll formula expression.')
    offset = pattern.lastIndex
    if (match[1]) tokens.push({ type: 'number', value: Number(match[1]) })
    else if (match[2]) tokens.push({ type: 'identifier', value: match[2] })
    else tokens.push({ type: match[3], value: match[3] })
  }
  tokens.push({ type: 'eof', value: null })
  return tokens
}

function evaluateExpression(expression, context) {
  try {
    const tokens = tokenizeExpression(expression)
    const state = { index: 0 }

    const parseFactor = () => {
      const token = tokens[state.index] || { type: 'eof' }
      if (token.type === '-') {
        state.index += 1
        return -parseFactor()
      }
      if (token.type === 'number') {
        state.index += 1
        return Number(token.value || 0)
      }
      if (token.type === 'identifier') {
        const name = String(token.value || '')
        state.index += 1
        if ((tokens[state.index]?.type || '') === '(') {
          state.index += 1
          const args = []
          if ((tokens[state.index]?.type || '') !== ')') {
            while (true) {
              args.push(parseAddSub())
              if ((tokens[state.index]?.type || '') !== ',') break
              state.index += 1
            }
          }
          if ((tokens[state.index]?.type || '') !== ')') throw new Error('Missing function closing parenthesis.')
          state.index += 1
          if (name === 'min') return args.length ? Math.min(...args) : 0
          if (name === 'max') return args.length ? Math.max(...args) : 0
          if (name === 'abs') return Math.abs(args[0] || 0)
          if (name === 'round') {
            const value = Number(args[0] || 0)
            const precision = Math.trunc(Number(args[1] || 0))
            const factor = 10 ** precision
            if (!Number.isFinite(value) || !Number.isFinite(factor) || factor === 0) return 0
            return Math.round(value * factor) / factor
          }
          throw new Error('Unsupported payroll formula function.')
        }
        return Number(context[name] || 0)
      }
      if (token.type === '(') {
        state.index += 1
        const value = parseAddSub()
        if ((tokens[state.index]?.type || '') !== ')') throw new Error('Missing closing parenthesis.')
        state.index += 1
        return value
      }
      throw new Error('Unexpected payroll formula factor.')
    }

    const parseMulDiv = () => {
      let value = parseFactor()
      while (['*', '/'].includes(tokens[state.index]?.type || '')) {
        const operator = tokens[state.index].type
        state.index += 1
        const right = parseFactor()
        value = operator === '*' ? value * right : (right === 0 ? 0 : value / right)
      }
      return value
    }

    const parseAddSub = () => {
      let value = parseMulDiv()
      while (['+', '-'].includes(tokens[state.index]?.type || '')) {
        const operator = tokens[state.index].type
        state.index += 1
        const right = parseMulDiv()
        value = operator === '+' ? value + right : value - right
      }
      return value
    }

    const result = parseAddSub()
    if ((tokens[state.index]?.type || 'eof') !== 'eof') throw new Error('Unexpected payroll formula token.')
    return result
  } catch {
    return 0
  }
}

function buildCatalogComputation(payslip = {}, catalog = []) {
  const items = normalizePayrollItemCatalog(catalog).filter((item) => item.active)
  const context = normalizeNumericContext({ ...(payslip || {}), ...(payslip?.inputs || {}) })
  const resolved = {}
  let gross = 0
  let deductions = 0

  items.forEach((item) => {
    const expression = buildPayrollItemExpression(item)
    const rawValue = Number(resolveInputValueFromPayslip(payslip, item) || 0)
    const computedValue = expression && isFormulaCapablePayrollItem(item)
      ? Math.round(evaluateExpression(expression, context))
      : Math.round(rawValue)
    resolved[item.key] = computedValue
    if (item.key) context[item.key.replace(/[^A-Za-z0-9_]/g, '')] = computedValue
    if (item.type === 'earning') gross += computedValue
    if (item.type === 'deduction') deductions += computedValue
  })

  return { resolved, gross, deductions, net: gross - deductions }
}

export function resolveCatalogDisplayValue(payslip = {}, catalog = [], item = {}) {
  const normalizedItem = normalizeCatalogItem(item)
  if (!normalizedItem.key) return Number(resolveInputValueFromPayslip(payslip, item) || 0)
  return Number(buildCatalogComputation(payslip, catalog).resolved[normalizedItem.key] || 0)
}

export function isComputedCatalogItem(item = {}) {
  const normalizedItem = normalizeCatalogItem(item)
  return isFormulaCapablePayrollItem(normalizedItem) && normalizedItem.calcMode !== 'input'
}

export function calculateCatalogTotals(payslip = {}, catalog = []) {
  const computation = buildCatalogComputation(payslip, catalog)
  return { gross: computation.gross, deductions: computation.deductions, net: computation.net }
}
