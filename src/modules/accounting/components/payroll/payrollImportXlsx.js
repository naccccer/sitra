import * as XLSX from 'xlsx'
import { normalizeDigitsToLatin } from '@/utils/helpers'
import { safeNumber } from './payrollMath'

const FIXED_ALIASES = {
  employeecode: 'employeeCode',
  personnelno: 'personnelNo',
  nationalid: 'nationalId',
  notes: 'notes',
}

const FIXED_PERSIAN = [
  { match: ['کد پرسنلی', 'شماره پرسنلی'], field: 'employeeCode' },
  { match: ['شماره بیمه'], field: 'personnelNo' },
  { match: ['کد ملی'], field: 'nationalId' },
  { match: ['یادداشت', 'توضیحات'], field: 'notes' },
]

function normalizeHeader(value) {
  return normalizeDigitsToLatin(String(value || '').trim()).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function normalizeItemLabel(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function buildCatalogAliasMap(catalog = []) {
  const map = new Map()
  for (const item of (Array.isArray(catalog) ? catalog : [])) {
    if (!item?.key || item?.active === false) continue
    const key = String(item.key)
    const source = String(item.source || item.key)
    const normalizedLabel = normalizeHeader(item.label)
    const normalizedKey = normalizeHeader(key)
    const normalizedSource = normalizeHeader(source)
    if (normalizedLabel) map.set(normalizedLabel, source)
    if (normalizedKey) map.set(normalizedKey, source)
    if (normalizedSource) map.set(normalizedSource, source)
  }
  return map
}

function mapHeaders(headers = [], catalog = []) {
  const catalogAliasMap = buildCatalogAliasMap(catalog)
  return headers.reduce((mapped, header) => {
    const cleanHeader = String(header || '').trim()
    if (!cleanHeader) return mapped
    const fromPersian = FIXED_PERSIAN.find(({ match }) => match.some((label) => cleanHeader.includes(label)))?.field
    const fromFixed = FIXED_ALIASES[normalizeHeader(cleanHeader)]
    const fromCatalog = catalogAliasMap.get(normalizeHeader(cleanHeader))
    const field = fromPersian || fromFixed || fromCatalog || null
    if (field) mapped[header] = field
    return mapped
  }, {})
}

function identifyEmployee(row = {}, headerMap = {}) {
  const result = {
    employeeCode: '',
    personnelNo: '',
    nationalId: '',
  }
  for (const [header, rawValue] of Object.entries(row)) {
    const field = headerMap[header]
    if (!['employeeCode', 'personnelNo', 'nationalId'].includes(field)) continue
    result[field] = String(normalizeDigitsToLatin(rawValue || '')).trim()
  }
  return result
}

function toInputs(row = {}, headerMap = {}) {
  const values = {}
  for (const [header, rawValue] of Object.entries(row)) {
    const field = headerMap[header]
    if (!field || ['employeeCode', 'personnelNo', 'nationalId'].includes(field)) continue
    if (field === 'notes') {
      values.notes = String(rawValue || '').trim()
      continue
    }
    values[field] = safeNumber(normalizeDigitsToLatin(rawValue))
  }
  return values
}

function resolveEmployee(identifier = {}, indexes = {}) {
  const byCode = indexes.byEmployeeCode?.get(identifier.employeeCode) || null
  if (byCode) return byCode
  const byPersonnel = indexes.byPersonnelNo?.get(identifier.personnelNo) || null
  if (byPersonnel) return byPersonnel
  return indexes.byNationalId?.get(identifier.nationalId) || null
}

function summarizeRow(index, row, headerMap, indexes) {
  const identifier = identifyEmployee(row, headerMap)
  const values = toInputs(row, headerMap)
  const employee = resolveEmployee(identifier, indexes)
  const errors = []
  const warnings = []

  if (!identifier.employeeCode && !identifier.personnelNo && !identifier.nationalId) {
    errors.push('شناسه پرسنلی یا کد ملی در فایل موجود نیست.')
  }
  if (!employee) {
    errors.push('پرسنل متناظر در منابع انسانی پیدا نشد.')
  } else if (employee.isActive === false) {
    errors.push('پرسنل غیرفعال است و برای فیش قابل انتخاب نیست.')
  }
  const valueKeys = Object.keys(values).filter((key) => key !== 'notes')
  if (valueKeys.length === 0) {
    warnings.push('هیچ فیلد عددی برای این ردیف تشخیص داده نشد.')
  }

  return {
    rowNumber: index + 2,
    employee,
    identifier,
    values,
    errors,
    warnings,
  }
}

function buildEmployeeIndexes(employees = []) {
  const list = Array.isArray(employees) ? employees : []
  return {
    byEmployeeCode: new Map(list.map((employee) => [String(employee.employeeCode || employee.code || '').trim(), employee])),
    byPersonnelNo: new Map(list.map((employee) => [String(employee.personnelNo || '').trim(), employee])),
    byNationalId: new Map(list.map((employee) => [String(employee.nationalId || '').trim(), employee])),
  }
}

export function buildPayrollTemplateHeaders(catalog = []) {
  const identityHeaders = ['کد پرسنلی', 'شماره بیمه', 'کد ملی']
  const itemHeaders = (Array.isArray(catalog) ? catalog : [])
    .filter((item) => item?.active !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((item) => normalizeItemLabel(item.label || item.key))
  return [...identityHeaders, ...itemHeaders, 'توضیحات']
}

export async function parsePayrollImportFile(file, employees = [], catalog = []) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('فایل اکسل خالی است.')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (rows.length === 0) throw new Error('هیچ سطری برای واردسازی پیدا نشد.')

  const headerMap = mapHeaders(Object.keys(rows[0]), catalog)
  const unknownHeaders = Object.keys(rows[0]).filter((header) => !headerMap[header])
  const indexes = buildEmployeeIndexes(employees)
  const parsedRows = rows.map((row, index) => summarizeRow(index, row, headerMap, indexes))

  const duplicateKeys = new Set()
  const seenKeys = new Set()
  parsedRows.forEach((row) => {
    const key = row.employee?.id || row.identifier.employeeCode || row.identifier.personnelNo || row.identifier.nationalId
    if (!key) return
    if (seenKeys.has(key)) duplicateKeys.add(key)
    seenKeys.add(key)
  })
  parsedRows.forEach((row) => {
    const key = row.employee?.id || row.identifier.employeeCode || row.identifier.personnelNo || row.identifier.nationalId
    if (key && duplicateKeys.has(key)) {
      row.errors.push('برای این پرسنل بیش از یک ردیف در فایل وجود دارد.')
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
