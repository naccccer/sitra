import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button, Card, Input, Select } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { buildPayrollTemplateHeaders, parsePayrollImportFile } from './payrollImportXlsx'

function createTemplateRows(headers = []) {
  return [Object.fromEntries(headers.map((header) => [header, '']))]
}

function createSampleRows(headers = []) {
  const base = Object.fromEntries(headers.map((header) => [header, '']))
  if (Object.hasOwn(base, 'کد پرسنلی')) base['کد پرسنلی'] = '1001'
  if (Object.hasOwn(base, 'شماره بیمه')) base['شماره بیمه'] = '1001'
  if (Object.hasOwn(base, 'کد ملی')) base['کد ملی'] = '0012345678'
  if (Object.hasOwn(base, 'کارکرد (روز)')) base['کارکرد (روز)'] = 30
  if (Object.hasOwn(base, 'مرخصی استفاده شده')) base['مرخصی استفاده شده'] = 0
  if (Object.hasOwn(base, 'مانده مرخصی')) base['مانده مرخصی'] = 5.5
  if (Object.hasOwn(base, 'ساعت اضافه کاری')) base['ساعت اضافه کاری'] = 12
  if (Object.hasOwn(base, 'مبلغ اضافه کاری')) base['مبلغ اضافه کاری'] = 3250000
  if (Object.hasOwn(base, 'حقوق پایه')) base['حقوق پایه'] = 125000000
  if (Object.hasOwn(base, 'حق مسکن')) base['حق مسکن'] = 9000000
  if (Object.hasOwn(base, 'بن خواربار')) base['بن خواربار'] = 22000000
  if (Object.hasOwn(base, 'بیمه')) base['بیمه'] = 9250000
  if (Object.hasOwn(base, 'مالیات')) base['مالیات'] = 5100000
  if (Object.hasOwn(base, 'توضیحات')) base['توضیحات'] = 'نمونه راهنما برای تست واردسازی'
  return [base]
}

function downloadWorkbook(fileName, rows) {
  const sheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false })
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Payroll')
  XLSX.writeFile(book, fileName)
}

export function PayrollImportPanel({ busy, catalog = [], employees, onApply, onManualEntry, onPreviewImport, run }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualEmployeeId, setManualEmployeeId] = useState('')
  const hasBlockingErrors = useMemo(() => preview?.summary?.errors > 0, [preview])
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const templateHeaders = useMemo(() => buildPayrollTemplateHeaders(catalog), [catalog])
  const runPayslipByEmployeeId = useMemo(() => {
    const map = new Map()
    for (const payslip of (run?.payslips || [])) {
      map.set(String(payslip?.employeeId || ''), payslip)
    }
    return map
  }, [run?.payslips])
  const selectedEmployee = useMemo(
    () => employeeList.find((employee) => String(employee.id) === manualEmployeeId) || null,
    [employeeList, manualEmployeeId],
  )
  const selectedEmployeePayslip = selectedEmployee ? runPayslipByEmployeeId.get(String(selectedEmployee.id)) || null : null

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      setPreview(await parsePayrollImportFile(file, employeeList, catalog))
    } catch (parseError) {
      setPreview(null)
      setError(parseError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualEntry = () => {
    if (!run?.id || !selectedEmployee || !onManualEntry) return
    onManualEntry({ employee: selectedEmployee, payslip: selectedEmployeePayslip })
  }

  const applyImport = async () => {
    if (!run?.id || !preview) return
    const payload = {
      periodId: run.id,
      periodKey: run.periodKey,
      rows: preview.rows.filter((row) => row.errors.length === 0).map((row) => ({
        employeeId: row.employee.id,
        employeeCode: row.identifier.employeeCode || undefined,
        nationalId: row.identifier.nationalId || undefined,
        inputs: Object.fromEntries(Object.entries(row.values).filter(([key]) => key !== 'notes')),
        notes: row.values.notes || '',
      })),
    }
    if (onPreviewImport) {
      const dryRun = await onPreviewImport(payload)
      const previewErrors = Array.isArray(dryRun?.errors) ? dryRun.errors : []
      if (previewErrors.length > 0) {
        setError('پیش نمایش سرور خطا دارد. ابتدا خطاهای فایل را اصلاح کنید.')
        return
      }
    }
    await onApply(payload)
    setPreview(null)
  }

  const downloadTemplate = () => {
    downloadWorkbook('payroll-import-template.xlsx', createTemplateRows(templateHeaders))
  }

  const downloadSamplePayslip = () => {
    downloadWorkbook('payroll-sample-slip.xlsx', createSampleRows(templateHeaders))
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">ورود اطلاعات فیش</div>
          <div className="text-xs font-bold text-slate-500">ثبت دستی یا ورود اکسل کامل ماهانه با خروجی سازگار با HR</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={downloadTemplate}>دانلود template</Button>
          <Button size="sm" variant="ghost" onClick={downloadSamplePayslip}>دانلود فایل نمونه فیش</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-900">ثبت دستی فیش</div>
            <div className="text-xs font-bold text-slate-500">فقط پرسنل فعال HR قابل انتخاب هستند.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={manualEmployeeId} onChange={(event) => setManualEmployeeId(String(event.target.value || ''))} className="min-w-52">
              <option value="">انتخاب پرسنل</option>
              {employeeList.map((employee) => (
                <option key={String(employee.id)} value={String(employee.id)}>{formatEmployeeOption(employee)}</option>
              ))}
            </Select>
            <Button size="sm" variant="primary" disabled={!run?.id || !manualEmployeeId} onClick={handleManualEntry}>
              {selectedEmployeePayslip ? 'ویرایش فیش' : 'فیش جدید'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-slate-900">ورود اکسل ماهانه</div>
          <div className="text-xs font-bold text-slate-500">فایل بر اساس کد پرسنلی/شماره بیمه و fallback کد ملی پردازش می‌شود.</div>
        </div>
        <Input type="file" accept=".xlsx,.xls" className="h-10 max-w-72 cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" onChange={(event) => handleFile(event.target.files?.[0] || null)} />
      </div>

      {!run?.id && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">برای اعمال فایل، ابتدا یک دوره حقوق را انتخاب کنید.</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">در حال خواندن فایل اکسل...</div>}

      {preview && (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <Summary label="تعداد ردیف" value={preview.summary.total} />
            <Summary label="قابل اعمال" value={preview.summary.valid} />
            <Summary label="هشدار" value={preview.summary.warnings} />
            <Summary label="خطا" value={preview.summary.errors} />
          </div>
          {preview.unknownHeaders.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">ستون‌های نادیده گرفته شده: {preview.unknownHeaders.join('، ')}</div>}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="px-3 py-2">ردیف</th>
                  <th className="px-3 py-2">پرسنل</th>
                  <th className="px-3 py-2">فیلدها</th>
                  <th className="px-3 py-2">اعتبارسنجی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {preview.rows.map((row) => (
                  <tr key={`${row.rowNumber}:${row.employee?.id || row.identifier.employeeCode || row.identifier.nationalId || 'row'}`}>
                    <td className="px-3 py-2 font-black text-slate-900">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <div className="font-black text-slate-900">{row.employee?.fullName || row.employee?.name || '-'}</div>
                      <div className="text-[11px] font-bold text-slate-500">{row.identifier.employeeCode || row.identifier.personnelNo || row.identifier.nationalId || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{Object.keys(row.values).join('، ') || '-'}</td>
                    <td className="px-3 py-2">
                      {row.errors.map((message) => <div key={message} className="text-[11px] font-bold text-rose-700">{message}</div>)}
                      {row.warnings.map((message) => <div key={message} className="text-[11px] font-bold text-amber-700">{message}</div>)}
                      {row.errors.length === 0 && row.warnings.length === 0 && <div className="text-[11px] font-bold text-emerald-700">آماده اعمال</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>پاک کردن پیش نمایش</Button>
            <Button size="sm" variant="primary" disabled={!run?.id || busy || hasBlockingErrors} onClick={applyImport}>
              {busy ? 'در حال اعمال...' : 'اعمال به دوره انتخابی'}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

function formatEmployeeOption(employee = {}) {
  const fullName = String(employee?.fullName || employee?.name || '').trim() || 'بدون نام'
  const employeeCode = String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
  return `${fullName} (${toPN(employeeCode || 'بدون کد')})`
}

function Summary({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-slate-900">{value}</div></div>
}

