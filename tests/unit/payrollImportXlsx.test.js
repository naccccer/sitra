import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildPayrollTemplateHeaders, parsePayrollImportFile } from '../../src/modules/accounting/components/payroll/payrollImportXlsx'

const catalog = [
  { key: 'workDays', label: 'کارکرد (روز)', type: 'work', source: 'workDays', active: true, sortOrder: 10 },
  { key: 'baseSalary', label: 'حقوق پایه', type: 'earning', source: 'baseSalary', active: true, sortOrder: 100 },
  { key: 'insurance', label: 'بیمه', type: 'deduction', source: 'insurance', active: true, sortOrder: 200 },
]

const employees = [
  { id: '1', fullName: 'علی رضایی', employeeCode: '1001', personnelNo: '1001', nationalId: '1234567890', isActive: true },
]

function workbookToFile(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Payroll')
  return new File(
    [XLSX.write(book, { type: 'array', bookType: 'xlsx' })],
    'payroll-import.xlsx',
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  )
}

describe('payroll import xlsx', () => {
  it('builds template headers from active catalog', () => {
    const headers = buildPayrollTemplateHeaders(catalog)
    expect(headers).toContain('کد پرسنلی')
    expect(headers).toContain('حقوق پایه')
    expect(headers).toContain('بیمه')
  })

  it('parses a valid row and maps by personnel code', async () => {
    const file = workbookToFile([{
      'کد پرسنلی': '1001',
      'کارکرد (روز)': 30,
      'حقوق پایه': 125000000,
      بیمه: 9000000,
      توضیحات: 'نمونه',
    }])
    const parsed = await parsePayrollImportFile(file, employees, catalog)

    expect(parsed.summary.total).toBe(1)
    expect(parsed.summary.valid).toBe(1)
    expect(parsed.summary.errors).toBe(0)
    expect(parsed.rows[0].employee.id).toBe('1')
    expect(parsed.rows[0].values.baseSalary).toBe(125000000)
    expect(parsed.rows[0].values.workDays).toBe(30)
    expect(parsed.rows[0].values.insurance).toBe(9000000)
  })
})

