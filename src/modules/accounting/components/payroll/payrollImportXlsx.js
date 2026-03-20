import * as XLSX from 'xlsx'
import { normalizeDigitsToLatin } from '@/utils/helpers'
import { safeNumber } from './payrollMath'

const FIELD_ALIASES = {
  employeecode: 'employeeCode',
  code: 'employeeCode',
  personnelcode: 'employeeCode',
  nationalid: 'nationalId',
  overtimehours: 'overtimeHours',
  overtimepay: 'overtimePay',
  bonus: 'bonus',
  housingallowance: 'housingAllowance',
  foodallowance: 'foodAllowance',
  childallowance: 'childAllowance',
  seniorityallowance: 'seniorityAllowance',
  otheradditions: 'otherAdditions',
  insurance: 'insurance',
  tax: 'tax',
  loandeduction: 'loanDeduction',
  advancededuction: 'advanceDeduction',
  absencededuction: 'absenceDeduction',
  otherdeductions: 'otherDeductions',
  notes: 'notes',
}

const PERSIAN_HEADER_MATCHERS = [
  { match: ['کد پرسنلی', 'شماره پرسنلی'], field: 'employeeCode' },
  { match: ['کد ملی'], field: 'nationalId' },
  { match: ['ساعت اضافه کار'], field: 'overtimeHours' },
  { match: ['مبلغ اضافه کار', 'اضافه کار'], field: 'overtimePay' },
  { match: ['پاداش'], field: 'bonus' },
  { match: ['حق مسکن'], field: 'housingAllowance' },
  { match: ['بن خواربار', 'حق غذا'], field: 'foodAllowance' },
  { match: ['حق اولاد'], field: 'childAllowance' },
  { match: ['سنوات'], field: 'seniorityAllowance' },
  { match: ['مزایای متفرقه', 'سایر مزایا'], field: 'otherAdditions' },
  { match: ['بیمه'], field: 'insurance' },
  { match: ['مالیات'], field: 'tax' },
  { match: ['اقساط', 'وام'], field: 'loanDeduction' },
  { match: ['علی الحساب'], field: 'advanceDeduction' },
  { match: ['غیبت', 'کسری کار'], field: 'absenceDeduction' },
  { match: ['سایر کسورات'], field: 'otherDeductions' },
  { match: ['یادداشت', 'توضیحات'], field: 'notes' },
]

const VARIABLE_FIELDS = new Set([
  'overtimeHours',
  'overtimePay',
  'bonus',
  'housingAllowance',
  'foodAllowance',
  'childAllowance',
  'seniorityAllowance',
  'otherAdditions',
  'insurance',
  'tax',
  'loanDeduction',
  'advanceDeduction',
  'absenceDeduction',
  'otherDeductions',
  'notes',
])

function normalizeHeader(value) {
  return normalizeDigitsToLatin(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function mapHeaders(headers = []) {
  return headers.reduce((mapped, header) => {
    const normalizedHeader = String(header || '').trim()
    const persianField = PERSIAN_HEADER_MATCHERS.find(({ match }) => match.some((item) => normalizedHeader.includes(item)))?.field
    const field = persianField || FIELD_ALIASES[normalizeHeader(header)]
    if (field) mapped[header] = field
    return mapped
  }, {})
}

function toRowPayload(row, headerMap) {
  return Object.entries(row).reduce((payload, [header, rawValue]) => {
    const field = headerMap[header]
    if (!field || !VARIABLE_FIELDS.has(field)) return payload
    payload[field] = field === 'notes' ? String(rawValue || '').trim() : safeNumber(normalizeDigitsToLatin(rawValue))
    return payload
  }, {})
}

function identifyEmployee(row, headerMap) {
  const identifierEntries = Object.entries(row).filter(([header]) => {
    const field = headerMap[header]
    return field === 'employeeCode' || field === 'nationalId'
  })
  return identifierEntries.reduce((result, [header, value]) => {
    const field = headerMap[header]
    result[field] = String(normalizeDigitsToLatin(value || '')).trim()
    return result
  }, {})
}

function summarizeRow(index, row, headerMap, employeesByCode, employeesByNationalId) {
  const errors = []
  const warnings = []
  const identifier = identifyEmployee(row, headerMap)
  const variableData = toRowPayload(row, headerMap)
  const employee = identifier.employeeCode
    ? employeesByCode.get(identifier.employeeCode)
    : identifier.nationalId
      ? employeesByNationalId.get(identifier.nationalId)
      : null

  if (!identifier.employeeCode && !identifier.nationalId) {
    errors.push('شناسه پرسنلی یا کد ملی در فایل موجود نیست.')
  }
  if (!employee) {
    errors.push('کارمند متناظر در سیستم پیدا نشد.')
  }
  if (Object.keys(variableData).length === 0) {
    warnings.push('هیچ فیلد ماهانه قابل اعمالی در این ردیف تشخیص داده نشد.')
  }

  return {
    rowNumber: index + 2,
    employee,
    identifier,
    values: variableData,
    errors,
    warnings,
  }
}

export async function parsePayrollImportFile(file, employees = []) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('فایل اکسل خالی است.')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (rows.length === 0) throw new Error('هیچ سطری برای واردسازی پیدا نشد.')

  const headerMap = mapHeaders(Object.keys(rows[0]))
  const unknownHeaders = Object.keys(rows[0]).filter((header) => !headerMap[header])
  const employeesByCode = new Map(employees.map((employee) => [String(employee.employeeCode || employee.code || '').trim(), employee]))
  const employeesByNationalId = new Map(employees.map((employee) => [String(employee.nationalId || '').trim(), employee]))

  const parsedRows = rows.map((row, index) => summarizeRow(index, row, headerMap, employeesByCode, employeesByNationalId))
  const duplicateKeys = new Set()
  const seenKeys = new Set()

  parsedRows.forEach((row) => {
    const key = row.employee?.id || row.identifier.employeeCode || row.identifier.nationalId
    if (!key) return
    if (seenKeys.has(key)) duplicateKeys.add(key)
    seenKeys.add(key)
  })

  parsedRows.forEach((row) => {
    const key = row.employee?.id || row.identifier.employeeCode || row.identifier.nationalId
    if (key && duplicateKeys.has(key)) {
      row.errors.push('برای این کارمند بیش از یک ردیف در فایل وجود دارد.')
    }
  })

  return {
    rows: parsedRows,
    unknownHeaders,
    summary: {
      total: parsedRows.length,
      valid: parsedRows.filter((row) => row.errors.length === 0).length,
      warnings: parsedRows.filter((row) => row.warnings.length > 0).length,
      errors: parsedRows.filter((row) => row.errors.length > 0).length,
    },
  }
}
