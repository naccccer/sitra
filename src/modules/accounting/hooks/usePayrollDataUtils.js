import { accountingApi } from '../services/accountingApi'
import { normalizePayrollListPayslip } from '../components/payroll/payrollMath'

export const DEFAULT_PAYROLL_SETTINGS = {
  companyName: 'سامانه حقوق و دستمزد',
  companyId: '',
  signatureLabel: 'امضا و تایید',
  signatoryName: '',
  signatoryTitle: '',
  signatureNote: '',
  footerNote: 'این فیش به صورت سیستمی تولید شده است.',
}

export const PAYROLL_INPUT_FIELDS = [
  'baseSalary',
  'housingAllowance',
  'foodAllowance',
  'childAllowance',
  'seniorityAllowance',
  'overtimeHours',
  'overtimePay',
  'bonus',
  'otherAdditions',
  'insurance',
  'tax',
  'loanDeduction',
  'advanceDeduction',
  'absenceDeduction',
  'otherDeductions',
]

export function normalizePayrollSettings(value) {
  if (!value) return { ...DEFAULT_PAYROLL_SETTINGS }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return { ...DEFAULT_PAYROLL_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULT_PAYROLL_SETTINGS }
  }
}

export async function fetchAllPayrollPayslips(filters = {}) {
  const firstPage = await accountingApi.fetchPayrollPayslips({ ...filters, page: 1, pageSize: 100 })
  const firstItems = Array.isArray(firstPage?.payslips) ? firstPage.payslips : []
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1))
  if (totalPages === 1) {
    return firstItems.map(normalizePayrollListPayslip)
  }
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => accountingApi.fetchPayrollPayslips({
      ...filters,
      page: index + 2,
      pageSize: 100,
    })),
  )
  return [...firstItems, ...rest.flatMap((page) => Array.isArray(page?.payslips) ? page.payslips : [])]
    .map(normalizePayrollListPayslip)
}
