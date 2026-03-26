import { useMemo, useRef, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Button, Input, ModalShell } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { calculatePayslipTotals, formatMoney } from './payrollMath'
import { calculateCatalogTotals, resolveInputValueFromPayslip, splitCatalogByType } from './payrollCatalog'
import { PayrollMetricCard } from './PayrollMetricCard'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'

function updateDraftInput(draft, source, value) {
  return { ...draft, [source]: value, inputs: { ...(draft.inputs || {}), [source]: value } }
}

export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, onUploadPdf, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [file, setFile] = useState(null)
  const pdfInputRef = useRef(null)

  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const selectedEmployee = useMemo(() => employeeMap.get(String(draft?.employeeId ?? '')) || null, [draft?.employeeId, employeeMap])
  const totals = useMemo(() => {
    const fallback = calculatePayslipTotals(draft ?? payslip)
    const catalogTotals = calculateCatalogTotals(draft ?? payslip, catalog)
    return catalogTotals.gross === 0 && catalogTotals.deductions === 0 ? fallback : catalogTotals
  }, [catalog, draft, payslip])
  const scopedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])
  if (!payslip) return null

  const employeeName = selectedEmployee?.fullName || selectedEmployee?.name || draft?.employeeName || payslip?.employeeName || ''
  const employeeCode = resolveEmployeeCode(selectedEmployee) || draft?.employeeCode || payslip?.employeeCode || ''

  const handleSave = () => {
    const employeeId = String(draft?.employeeId || '').trim()
    if (!employeeId) {
      return
    }
    const employee = employeeMap.get(employeeId) || null
    onSave({ ...draft, employeeId, employeeName: employee?.fullName || employee?.name || draft?.employeeName || '', employeeCode: resolveEmployeeCode(employee) || draft?.employeeCode || '', department: employee?.department || draft?.department || '' })
  }

  const clearPdfFile = () => {
    setFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  return (
    <ModalShell
      isOpen={Boolean(payslip)}
      onClose={onClose}
      title={`فیش حقوق ${employeeName || 'بدون نام'} ${employeeCode ? `(${toPN(employeeCode)})` : ''}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-5xl"
      closeButtonMode="icon"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-500">خالص پرداختی: <span className="font-black text-slate-900">{formatMoney(totals.net)}</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={handleSave}>{busy ? 'در حال ذخیره...' : 'ذخیره فیش'}</Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <PayrollMetricCard label="جمع دریافتی" value={formatMoney(totals.gross)} />
          <PayrollMetricCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
          <PayrollMetricCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasis />
        </div>

        <ItemTable title="کارکرد و اطلاعات" items={[...scopedCatalog.info, ...scopedCatalog.work]} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} />
        <ItemTable title="دریافتی‌ها" items={scopedCatalog.earning} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} />
        <ItemTable title="کسورات" items={scopedCatalog.deduction} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} />

        <label className="block space-y-1">
          <span className="block text-xs font-black text-slate-600">یادداشت</span>
          <textarea value={draft?.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
        </label>

        <PayrollSurfaceCard>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Button size="sm" variant="secondary" onClick={() => pdfInputRef.current?.click()}>انتخاب فایل PDF</Button>
            {file ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>{file.name}</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-rose-600 hover:bg-rose-100"
                  onClick={clearPdfFile}
                  aria-label="پاک کردن فایل"
                  title="پاک کردن فایل"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled={!file || busy}
              onClick={() => onUploadPdf(file)}
            >
              {busy ? 'در حال ارسال...' : 'آپلود PDF'}
            </Button>
          </div>
        </PayrollSurfaceCard>
      </div>
    </ModalShell>
  )
}

function ItemTable({ title, items = [], onChange, payslip }) {
  if (!items.length) return null
  const toneClass = 'border-slate-300 bg-slate-50'
  const itemToneClass = 'border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgba(148,163,184,0.22)]'

  return (
    <PayrollSurfaceCard className={`space-y-2 p-2 ${toneClass}`}>
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const source = String(item.source || item.key)
          return (
            <div key={item.key} className={`rounded-xl border px-2 py-1.5 ${itemToneClass}`}>
              <div className="mb-1 text-[11px] font-bold text-slate-600">{item.label}</div>
              <Input type="number" value={resolveInputValueFromPayslip(payslip, item)} onChange={(event) => onChange(source, Number(event.target.value || 0))} />
            </div>
          )
        })}
      </div>
    </PayrollSurfaceCard>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}
