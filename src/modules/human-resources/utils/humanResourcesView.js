import { normalizeDigitsToLatin } from '@/utils/helpers'

export const EMPTY_FORM = {
  id: '',
  employeeCode: '',
  firstName: '',
  lastName: '',
  nationalId: '',
  mobile: '',
  department: '',
  jobTitle: '',
  bankName: '',
  bankAccountNo: '',
  bankSheba: '',
  notes: '',
  isActive: true,
}

const PAYROLL_REQUIRED_FIELDS = [
  ['nationalId', 'کد ملی'],
  ['department', 'واحد'],
  ['jobTitle', 'سمت'],
  ['bankName', 'نام بانک'],
  ['bankAccountNo', 'شماره حساب'],
  ['bankSheba', 'شماره شبا'],
]

export function trimValue(value) {
  return String(value || '').trim()
}

export function splitFullName(fullName = '') {
  const parts = trimValue(fullName).split(/\s+/).filter(Boolean)
  const firstName = parts.shift() || ''
  const lastName = parts.join(' ') || firstName
  return { firstName, lastName }
}

export function toFormState(employee = {}) {
  const name = splitFullName(employee.fullName || '')
  return {
    ...EMPTY_FORM,
    id: String(employee.id || ''),
    employeeCode: trimValue(employee.employeeCode),
    firstName: trimValue(employee.firstName) || name.firstName,
    lastName: trimValue(employee.lastName) || name.lastName,
    nationalId: trimValue(employee.nationalId),
    mobile: trimValue(employee.mobile),
    department: trimValue(employee.department),
    jobTitle: trimValue(employee.jobTitle),
    bankName: trimValue(employee.bankName),
    bankAccountNo: trimValue(employee.bankAccountNo),
    bankSheba: trimValue(employee.bankSheba),
    notes: trimValue(employee.notes),
    isActive: employee.isActive !== false,
  }
}

export function displayName(employee = {}) {
  return employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '-'
}

export function normalizeNumericInput(value) {
  return normalizeDigitsToLatin(value).replace(/[^\d]/g, '')
}

export function getMissingPayrollFields(employee = {}) {
  return PAYROLL_REQUIRED_FIELDS.filter(([key]) => !trimValue(employee[key])).map(([, label]) => label)
}

export function hasMissingPayrollData(employee = {}) {
  return getMissingPayrollFields(employee).length > 0
}
