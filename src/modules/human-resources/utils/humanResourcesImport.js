import * as XLSX from 'xlsx'
import { normalizeDigitsToLatin } from '@/utils/helpers'

const HEADER_ALIASES = {
  firstname: 'firstName',
  lastname: 'lastName',
  nationalid: 'nationalId',
  mobile: 'mobile',
  department: 'department',
  jobtitle: 'jobTitle',
  bankname: 'bankName',
  bankaccountno: 'bankAccountNo',
  banksheba: 'bankSheba',
  notes: 'notes',
}

const PERSIAN_HEADERS = [
  { match: ['نام', 'نام پرسنل'], field: 'firstName' },
  { match: ['نام خانوادگی'], field: 'lastName' },
  { match: ['کد ملی'], field: 'nationalId' },
  { match: ['موبایل', 'شماره موبایل'], field: 'mobile' },
  { match: ['واحد'], field: 'department' },
  { match: ['سمت'], field: 'jobTitle' },
  { match: ['نام بانک'], field: 'bankName' },
  { match: ['شماره حساب'], field: 'bankAccountNo' },
  { match: ['شماره شبا'], field: 'bankSheba' },
  { match: ['یادداشت', 'توضیحات'], field: 'notes' },
]

const PERSIAN_HEADER_MATCHERS = PERSIAN_HEADERS
  .flatMap(({ field, match }) => match.map((value) => ({ field, value })))
  .sort((left, right) => right.value.length - left.value.length)

const SAMPLE_HEADERS = [
  'نام',
  'نام خانوادگی',
  'کد ملی',
  'موبایل',
  'واحد',
  'سمت',
  'نام بانک',
  'شماره حساب',
  'شماره شبا',
  'یادداشت',
]

const SAMPLE_HEADER_FIELDS = [
  'firstName',
  'lastName',
  'nationalId',
  'mobile',
  'department',
  'jobTitle',
  'bankName',
  'bankAccountNo',
  'bankSheba',
  'notes',
]

function normalizeHeader(value) {
  return normalizeDigitsToLatin(value).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '')
}

function resolveField(header) {
  const normalized = String(header || '').trim()
  const persianMatch = PERSIAN_HEADER_MATCHERS.find(({ value }) => normalized.includes(value))
  if (persianMatch) return persianMatch.field
  return HEADER_ALIASES[normalizeHeader(header)] || null
}

function toRowObjectFromColumns(row = [], columnFields = []) {
  return row.reduce((acc, rawValue, index) => {
    const field = columnFields[index]
    if (!field) return acc
    const value = String(rawValue ?? '').trim()
    acc[field] = normalizeDigitsToLatin(value).trim()
    return acc
  }, {})
}

function makeEmployeeMaps(employees = []) {
  const byNationalId = new Map()
  employees.forEach((employee) => {
    const nationalId = String(employee?.nationalId || '').trim()
    if (nationalId) byNationalId.set(nationalId, employee)
  })
  return { byNationalId }
}

export async function parseHumanResourcesImportFile(file, employees = []) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('فایل اکسل خالی است.')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
  if (rows.length === 0) throw new Error('فایل اکسل خالی است.')

  const headerRow = Array.isArray(rows[0]) ? rows[0] : []
  const dataRows = rows.slice(1).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
  const columnFields = headerRow.map((header, index) => resolveField(header) || SAMPLE_HEADER_FIELDS[index] || null)
  const unknownHeaders = headerRow.filter((header, index) => !columnFields[index] && String(header ?? '').trim())
  const { byNationalId } = makeEmployeeMaps(employees)
  const seenKeys = new Set()
  const duplicateKeys = new Set()

  const parsedRows = dataRows.map((row, index) => {
    const rowObject = toRowObjectFromColumns(row, columnFields)
    const errors = []
    const warnings = []
    const fullName = `${rowObject.firstName || ''} ${rowObject.lastName || ''}`.trim()
    const nationalId = String(rowObject.nationalId || '').trim()
    const employee = nationalId ? byNationalId.get(nationalId) || null : null

    if (!rowObject.firstName || !rowObject.lastName) {
      errors.push('نام و نام خانوادگی الزامی هستند.')
    }
    if (!nationalId) {
      warnings.push('کد ملی وارد نشده است؛ این ردیف به‌صورت رکورد جدید ثبت می‌شود.')
    }

    const key = nationalId || fullName
    if (key) {
      if (seenKeys.has(key)) duplicateKeys.add(key)
      seenKeys.add(key)
    }

    return {
      rowNumber: index + 2,
      employee,
      values: rowObject,
      errors,
      warnings,
    }
  })

  parsedRows.forEach((row) => {
    const key = String(row.values.nationalId || '').trim() || `${row.values.firstName || ''} ${row.values.lastName || ''}`.trim()
    if (key && duplicateKeys.has(key)) {
      row.errors.push('این نام یا کد ملی بیش از یک‌بار در فایل تکرار شده است.')
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

export function buildHumanResourcesSampleWorkbook() {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    SAMPLE_HEADERS,
    ['علی', 'رضایی', '1234567890', '09120000000', 'اداری', 'کارشناس', 'ملی', '123456789', 'IR123456789012345678901234', 'نمونه'],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'پرسنل')
  return workbook
}

export function downloadHumanResourcesSampleWorkbook() {
  const workbook = buildHumanResourcesSampleWorkbook()
  XLSX.writeFile(workbook, 'human-resources-sample.xlsx')
}
