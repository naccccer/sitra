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
    .filter((item) => item.active && (item.type === 'earning' || item.type === 'deduction') && item.source)
    .map((item, index) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      source: item.source,
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

export function calculateCatalogTotals(payslip = {}, catalog = []) {
  const grouped = splitCatalogByType(catalog)
  const sum = (items) => items.reduce((total, item) => total + Number(resolveInputValueFromPayslip(payslip, item) || 0), 0)
  const gross = sum(grouped.earning)
  const deductions = sum(grouped.deduction)
  return {
    gross,
    deductions,
    net: gross - deductions,
  }
}
