import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, FileSpreadsheet, Plus, X } from 'lucide-react'
import { Button, Card, Input } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { buildPayrollTemplateHeaders, parsePayrollImportFile } from './payrollImportXlsx'

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

export function PayrollImportPanel({ busy, catalog = [], employees, onApply, onManualEntry, onPreviewImport, run, runId = '', runPeriodKey = '' }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualEmployeeId, setManualEmployeeId] = useState('')
  const [manualEmployeeQuery, setManualEmployeeQuery] = useState('')
  const [importFile, setImportFile] = useState(null)
  const fileInputRef = useRef(null)

  const activeRunId = run?.id || runId || ''
  const activePeriodKey = run?.periodKey || runPeriodKey || ''
  const hasBlockingErrors = useMemo(() => preview?.summary?.errors > 0, [preview])
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const templateHeaders = useMemo(() => buildPayrollTemplateHeaders(catalog), [catalog])
  const employeeLabelIndex = useMemo(() => {
    const index = new Map()
    for (const employee of employeeList) {
      index.set(formatEmployeeOption(employee), String(employee.id))
    }
    return index
  }, [employeeList])
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
    setImportFile(file)
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

  const clearImportFile = () => {
    setImportFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleManualEntry = () => {
    if (!activeRunId || !selectedEmployee || !onManualEntry) return
    onManualEntry({ employee: selectedEmployee, payslip: selectedEmployeePayslip })
  }

  const handleEmployeeFieldChange = (value) => {
    setManualEmployeeQuery(value)
    const resolvedId = employeeLabelIndex.get(value)
    setManualEmployeeId(resolvedId || '')
  }

  const applyImport = async () => {
    if (!activeRunId || !preview) {
      setError('ابتدا یک دوره معتبر انتخاب کنید.')
      return
    }
    const payload = {
      periodId: activeRunId,
      periodKey: activePeriodKey,
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
    clearImportFile()
  }

  const downloadSamplePayslip = () => {
    downloadWorkbook('payroll-sample-slip.xlsx', createSampleRows(templateHeaders))
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="text-sm font-black text-slate-900">ورود اطلاعات فیش</div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,26rem)_auto] sm:items-end">
          <label className="space-y-1">
            <span className="block text-xs font-black text-slate-600">پرسنل</span>
            <Input
              value={manualEmployeeQuery}
              onChange={(event) => handleEmployeeFieldChange(event.target.value)}
              placeholder="انتخاب یا جستجوی پرسنل"
              list="payroll-import-employees"
              className="text-right"
              dir="rtl"
            />
            <datalist id="payroll-import-employees">
              {employeeList.map((employee) => (
                <option key={String(employee.id)} value={formatEmployeeOption(employee)} />
              ))}
            </datalist>
          </label>
          {importFile && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{importFile.name}</span>
              <button type="button" className="rounded p-0.5 text-rose-600 hover:bg-rose-100" onClick={clearImportFile} aria-label="پاک کردن فایل" title="پاک کردن فایل">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
          <Button size="sm" variant="primary" disabled={!activeRunId || !manualEmployeeId} onClick={handleManualEntry} className="gap-1">
            <Plus className="h-4 w-4" />
            {selectedEmployeePayslip ? 'ویرایش فیش' : 'فیش جدید'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
            onClick={() => fileInputRef.current?.click()}
          >
            انتخاب فایل اکسل
          </Button>
          <Button size="sm" variant="success" onClick={downloadSamplePayslip} className="gap-1.5">
            <Download className="h-4 w-4" />
            نمونه
          </Button>
        </div>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => handleFile(event.target.files?.[0] || null)} />

      {!activeRunId && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">ابتدا دوره را انتخاب کنید.</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">در حال خواندن فایل...</div>}

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
            <Button size="sm" variant="primary" disabled={!activeRunId || busy || hasBlockingErrors} onClick={applyImport}>
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
