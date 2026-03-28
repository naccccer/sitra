import { toPN } from '@/utils/helpers'
import { toShamsiDisplay } from '../../utils/dateUtils'
const ADDITION_FIELDS = ['baseSalary', 'housingAllowance', 'foodAllowance', 'childAllowance', 'seniorityAllowance', 'overtimePay', 'bonus', 'otherAdditions']
const DEDUCTION_FIELDS = ['insurance', 'tax', 'loanDeduction', 'advanceDeduction', 'absenceDeduction', 'otherDeductions']
const ITEM_KEY_MAP = {
  baseSalary: 'base_salary',
  housingAllowance: 'housing_allowance',
  foodAllowance: 'food_allowance',
  childAllowance: 'child_allowance',
  seniorityAllowance: 'seniority_allowance',
  overtimePay: 'overtime',
  bonus: 'bonus',
  otherAdditions: 'other_earnings',
  insurance: 'insurance',
  tax: 'tax',
  loanDeduction: 'loan',
  advanceDeduction: 'advance_deduction',
  absenceDeduction: 'absence_deduction',
  otherDeductions: 'other_deductions',
}
export function safeNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
export function formatMoney(value) {
  return toPN(Math.round(safeNumber(value)).toLocaleString('en-US'))
}
export function formatNumber(value) {
  return toPN(Math.round(safeNumber(value)).toLocaleString('en-US'))
}
export function formatMaybeDate(value) {
  return value ? toShamsiDisplay(value) : '-'
}
export function sumPayments(payments = []) {
  return payments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0)
}
function getItemAmount(items = [], itemKey) {
  const item = items.find((entry) => entry?.itemKey === itemKey || entry?.key === itemKey)
  return safeNumber(item?.amount)
}
export function resolvePayslipField(payslip = {}, field) {
  if (field === 'notes') return payslip.notes || ''
  if (field === 'overtimeHours') return safeNumber(payslip.overtimeHours ?? payslip.inputs?.overtimeHours)
  if (Object.hasOwn(payslip, field) && !['inputs', 'payments', 'items'].includes(field)) {
    return safeNumber(payslip[field])
  }
  if (Object.hasOwn(payslip.inputs || {}, field)) {
    return safeNumber(payslip.inputs[field])
  }
  const itemKey = ITEM_KEY_MAP[field]
  if (itemKey) {
    return getItemAmount(payslip.items, itemKey)
  }
  return 0
}
export function resolvePayslipTotals(payslip = {}) {
  const safePayslip = payslip || {}
  const totals = safePayslip.totals || {}
  if (Object.keys(totals).length > 0) {
    return {
      gross: safeNumber(totals.earningsTotal),
      deductions: safeNumber(totals.deductionsTotal),
      net: safeNumber(totals.netTotal),
      paid: safeNumber(totals.paymentsTotal),
      due: safeNumber(totals.balanceDue),
    }
  }
  const gross = ADDITION_FIELDS.reduce((sum, field) => sum + resolvePayslipField(safePayslip, field), 0)
  const deductions = DEDUCTION_FIELDS.reduce((sum, field) => sum + resolvePayslipField(safePayslip, field), 0)
  const paid = sumPayments(safePayslip.payments)
  const net = gross - deductions
  return { gross, deductions, net, paid, due: Math.max(net - paid, 0) }
}
export function calculatePayslipTotals(payslip = {}) {
  const totals = resolvePayslipTotals(payslip)
  return { gross: totals.gross, deductions: totals.deductions, net: totals.net }
}
export function getPaymentStatus(netAmount, payments = []) {
  return getPaymentStatusFromTotals(safeNumber(netAmount), sumPayments(payments))
}
export function getPaymentStatusFromTotals(netAmount, paidAmount = 0) {
  const net = safeNumber(netAmount)
  const paid = safeNumber(paidAmount)
  if (net <= 0) return 'paid'
  if (paid <= 0) return 'unpaid'
  if (paid + 1 >= net) return 'paid'
  return 'partial'
}
export function getPaymentMeta(status) {
  const map = {
    unpaid: { label: 'تسویه نشده', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    partial: { label: 'پرداخت ناقص', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    paid: { label: 'تسویه شده', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }
  return map[status] ?? map.unpaid
}
export function getRunStatusMeta(status) {
  const map = {
    draft: { label: 'پیش نویس', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
    open: { label: 'پیش نویس', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
    approved: { label: 'تایید شده', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    issued: { label: 'صادر شده', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed: { label: 'صادر شده', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }
  return map[status] ?? { label: status || 'نامشخص', tone: 'bg-slate-100 text-slate-600 border-slate-200' }
}
export function normalizePayrollEmployee(employee = {}) {
  return { ...employee, id: String(employee.id ?? ''), baseSalary: safeNumber(employee.baseSalary) }
}
export function normalizePayrollPeriod(period = {}) {
  const rawStatus = String(period.status || 'open')
  return {
    ...period,
    id: String(period.id ?? ''),
    status: rawStatus === 'open' ? 'draft' : rawStatus === 'closed' ? 'issued' : rawStatus,
    issuedAt: period.issuedAt || period.payDate || null,
  }
}
export function normalizePayrollListPayslip(row = {}) {
  const employee = row.employee || {}
  const period = row.period || {}
  const totals = row.totals || {}
  const net = safeNumber(totals.netTotal)
  const paid = safeNumber(totals.paymentsTotal)
  const due = safeNumber(totals.balanceDue)
  return {
    ...createEmptyPayslip(normalizePayrollEmployee(employee)),
    id: String(row.id ?? ''),
    slipNo: row.slipNo || null,
    status: row.status || 'draft',
    employeeId: String(employee.id ?? row.employeeId ?? ''),
    employeeCode: employee.employeeCode || row.employeeCode || '',
    employeeName: employee.fullName || row.employeeName || '',
    periodId: String(period.id ?? row.periodId ?? ''),
    periodKey: period.periodKey || row.periodKey || '',
    periodTitle: period.title || row.periodTitle || '',
    payDate: period.payDate || row.payDate || null,
    totals: {
      earningsTotal: safeNumber(totals.earningsTotal),
      deductionsTotal: safeNumber(totals.deductionsTotal),
      netTotal: net,
      paymentsTotal: paid,
      balanceDue: due,
    },
    net,
    paid,
    due,
    paymentStatus: getPaymentStatusFromTotals(net, paid),
    issuedAt: row.issuedAt || null,
  }
}
export function normalizePayrollDetailPayslip(row = {}) {
  const employee = normalizePayrollEmployee(row.employee || {})
  const period = normalizePayrollPeriod(row.period || {})
  const payslip = {
    ...createEmptyPayslip(employee),
    id: String(row.id ?? ''),
    slipNo: row.slipNo || null,
    status: row.status || 'draft',
    employeeId: employee.id,
    employeeCode: employee.employeeCode || '',
    employeeName: employee.fullName || '',
    periodId: period.id,
    periodKey: period.periodKey || row.periodKey || '',
    periodTitle: period.title || row.periodTitle || '',
    payDate: period.payDate || null,
    notes: row.notes || '',
    inputs: row.inputs || {},
    items: Array.isArray(row.items) ? row.items : [],
    payments: Array.isArray(row.payments)
      ? row.payments.map((payment) => ({
        id: String(payment.id ?? ''),
        paymentDate: payment.paymentDate || '',
        paymentMethod: payment.paymentMethod || 'bank',
        accountId: payment.accountId || null,
        amount: safeNumber(payment.amount),
        referenceNo: payment.referenceNo || null,
        notes: payment.notes || null,
        voucherId: payment.voucherId || null,
      }))
      : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    approvedAt: row.approvedAt || null,
    issuedAt: row.issuedAt || null,
    cancelledAt: row.cancelledAt || null,
  }
  const setField = (field, itemKey) => {
    const fallback = field === 'baseSalary' ? employee.baseSalary : 0
    const resolvedValue = resolvePayslipField({ ...payslip, items: payslip.items }, field)
    payslip[field] = safeNumber(payslip.inputs?.[field] ?? resolvedValue ?? fallback)
    if (field === 'baseSalary' && payslip[field] <= 0) {
      payslip[field] = safeNumber(employee.baseSalary || resolvedValue)
    }
    if (itemKey && payslip[field] <= 0) {
      const item = payslip.items.find((entry) => entry?.itemKey === itemKey || entry?.key === itemKey)
      payslip[field] = safeNumber(item?.amount || payslip[field])
    }
  }
  setField('baseSalary', 'base_salary')
  setField('housingAllowance', 'housing_allowance')
  setField('foodAllowance', 'food_allowance')
  setField('childAllowance', 'child_allowance')
  setField('seniorityAllowance', 'seniority_allowance')
  setField('overtimePay', 'overtime')
  setField('bonus', 'bonus')
  setField('otherAdditions', 'other_earnings')
  setField('insurance', 'insurance')
  setField('tax', 'tax')
  setField('loanDeduction', 'loan')
  setField('advanceDeduction', 'advance_deduction')
  setField('absenceDeduction', 'absence_deduction')
  setField('otherDeductions', 'other_deductions')
  payslip.overtimeHours = safeNumber(payslip.inputs?.overtimeHours)
  const totals = resolvePayslipTotals(payslip)
  payslip.gross = totals.gross
  payslip.deductions = totals.deductions
  payslip.net = totals.net
  payslip.paid = totals.paid
  payslip.due = totals.due
  payslip.paymentStatus = getPaymentStatusFromTotals(totals.net, totals.paid)
  payslip.totals = {
    earningsTotal: totals.gross,
    deductionsTotal: totals.deductions,
    netTotal: totals.net,
    paymentsTotal: totals.paid,
    balanceDue: totals.due,
  }
  return payslip
}
export function resolvePayrollRunStatus(periodStatus, payslips = []) {
  const statuses = payslips.map((item) => item.status).filter(Boolean)
  if (statuses.includes('issued')) return 'issued'
  if (statuses.includes('approved')) return 'approved'
  return periodStatus || 'draft'
}
export function buildPayrollRun(period = {}, payslips = []) {
  const normalizedPeriod = normalizePayrollPeriod(period)
  const summary = buildRunSummary({ payslips })
  const issuedAt = payslips.find((item) => item.issuedAt)?.issuedAt || normalizedPeriod.issuedAt || null
  return {
    ...normalizedPeriod,
    status: resolvePayrollRunStatus(normalizedPeriod.status, payslips),
    title: normalizedPeriod.title || `لیست حقوق ${monthLabel(normalizedPeriod.periodKey)}`,
    issuedAt,
    payslips,
    summary,
  }
}
export function buildRunSummary(run = {}) {
  const payslips = Array.isArray(run.payslips) ? run.payslips : []
  return payslips.reduce((summary, payslip) => {
    const totals = resolvePayslipTotals(payslip)
    return {
      employees: summary.employees + 1,
      gross: summary.gross + totals.gross,
      net: summary.net + totals.net,
      paid: summary.paid + totals.paid,
      due: summary.due + totals.due,
    }
  }, { employees: 0, gross: 0, net: 0, paid: 0, due: 0 })
}
export function monthLabel(periodKey) {
  if (!periodKey) return '-'
  const [year, month] = String(periodKey).split('-')
  if (!year || !month) return periodKey
  return `${toPN(year)}/${toPN(month.padStart(2, '0'))}`
}
export function createEmptyPayslip(employee = {}) {
  return {
    id: employee.id || null,
    employeeId: employee.id || '',
    employeeCode: employee.employeeCode || employee.code || '',
    employeeName: employee.fullName || employee.name || '',
    department: employee.department || '',
    baseSalary: safeNumber(employee.baseSalary),
    housingAllowance: 0,
    foodAllowance: 0,
    childAllowance: 0,
    seniorityAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    bonus: 0,
    otherAdditions: 0,
    insurance: 0,
    tax: 0,
    loanDeduction: 0,
    advanceDeduction: 0,
    absenceDeduction: 0,
    otherDeductions: 0,
    notes: '',
    status: 'draft',
    payments: [],
    items: [],
    inputs: {},
    documents: [],
  }
}
