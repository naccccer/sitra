import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Button, Input, ModalShell } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { calculatePayslipTotals, formatMoney } from './payrollMath'
import { calculateCatalogTotals, resolveInputValueFromPayslip, splitCatalogByType } from './payrollCatalog'
import { PayrollSectionHeader, PayrollStat, PayrollSurface, PayrollTiny } from './PayrollUiPrimitives'

function updateDraftInput(draft, source, value) {
  return { ...draft, [source]: value, inputs: { ...(draft.inputs || {}), [source]: value } }
}

export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, onUploadPdf, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [file, setFile] = useState(null)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [error, setError] = useState('')
  const [showNotes, setShowNotes] = useState(Boolean(payslip?.notes))
  const pdfInputRef = useRef(null)

  useEffect(() => {
    setDraft(payslip)
    setFile(null)
    setError('')
    setShowNotes(Boolean(payslip?.notes))
    setEmployeeQuery(payslip ? formatEmployeeOption({ fullName: payslip.employeeName, employeeCode: payslip.employeeCode }) : '')
  }, [payslip])

  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const employeeLabelIndex = useMemo(() => {
    const index = new Map()
    for (const employee of employeeList) index.set(formatEmployeeOption(employee), String(employee.id))
    return index
  }, [employeeList])
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
  const employeeDepartment = selectedEmployee?.department || draft?.department || payslip?.department || ''

  const handleEmployeeFieldChange = (value) => {
    setEmployeeQuery(value)
    const nextId = employeeLabelIndex.get(value)
    if (!nextId) {
      setDraft((current) => ({ ...current, employeeId: '' }))
      setError('')
      return
    }
    const employee = employeeMap.get(nextId)
    setDraft((current) => ({ ...current, employeeId: nextId, employeeName: employee?.fullName || employee?.name || '', employeeCode: resolveEmployeeCode(employee), department: employee?.department || '' }))
    setError('')
  }

  const handleSave = () => {
    const employeeId = String(draft?.employeeId || '').trim()
    if (!employeeId || !employeeMap.has(employeeId)) {
      setError('یک پرسنل معتبر انتخاب کنید.')
      return
    }
    const employee = employeeMap.get(employeeId)
    setError('')
    onSave({ ...draft, employeeId, employeeName: employee?.fullName || employee?.name || draft?.employeeName || '', employeeCode: resolveEmployeeCode(employee) || draft?.employeeCode || '', department: employee?.department || draft?.department || '' })
  }

  const clearPdfFile = () => {
    setFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }
  const handleUploadPdf = () => { if (file && onUploadPdf) onUploadPdf(file) }

  return (
    <ModalShell isOpen={Boolean(payslip)} onClose={onClose} title={`فیش حقوق ${employeeName || 'بدون نام'}`} description={`دوره ${run?.title || run?.periodKey || '-'}`} maxWidthClass="max-w-7xl" footer={(
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-500">خالص پرداختی: <span className="font-black text-slate-900">{formatMoney(totals.net)}</span></div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
          <Button size="sm" variant="primary" disabled={busy} onClick={handleSave}>{busy ? 'در حال ذخیره...' : 'ذخیره فیش'}</Button>
        </div>
      </div>
    )}>
      <div className="h-[min(78vh,700px)] overflow-hidden">
        <div className="grid h-full gap-3 xl:grid-cols-[1fr_1.2fr_0.95fr]">
          <div className="grid gap-3 overflow-hidden">
            <PayrollSurface className="space-y-2">
              <PayrollSectionHeader title="مشخصات پرسنل" subtitle="انتخاب پرسنل و مشاهده وضعیت" />
              <label className="space-y-1">
                <span className="block text-xs font-black text-slate-600">پرسنل</span>
                <Input value={employeeQuery || formatEmployeeOption({ fullName: employeeName, employeeCode })} onChange={(event) => handleEmployeeFieldChange(event.target.value)} placeholder="انتخاب یا جستجوی پرسنل" list="payslip-editor-employees" className="text-right" dir="rtl" />
                <datalist id="payslip-editor-employees">{employeeList.map((employee) => <option key={String(employee.id)} value={formatEmployeeOption(employee)} />)}</datalist>
                {error && <span className="block text-xs font-bold text-rose-600">{error}</span>}
              </label>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <PayrollTiny label="کد پرسنلی" value={toPN(employeeCode || '-')} />
                <PayrollTiny label="واحد" value={employeeDepartment || '-'} />
                <PayrollTiny label="وضعیت" value={draft?.status || payslip.status || 'draft'} />
              </div>
            </PayrollSurface>
            <PayrollSurface className="flex min-h-0 flex-col">
              <PayrollSectionHeader title="یادداشت" subtitle="توضیحات فیش حقوقی" actions={showNotes ? <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}>بستن یادداشت</Button> : null} />
              {!showNotes ? <Button size="sm" variant="secondary" onClick={() => setShowNotes(true)}>افزودن یادداشت</Button> : <textarea value={draft?.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />}
            </PayrollSurface>
          </div>
          <div className="grid min-h-0 gap-3 overflow-hidden">
            <ItemTable title="کارکرد و اطلاعات" items={[...scopedCatalog.info, ...scopedCatalog.work]} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} maxBodyHeightClass="max-h-44" />
            <ItemTable title="دریافتی‌ها" items={scopedCatalog.earning} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} tone="emerald" maxBodyHeightClass="max-h-40" />
            <ItemTable title="کسورات" items={scopedCatalog.deduction} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} tone="rose" maxBodyHeightClass="max-h-40" />
          </div>
          <div className="grid gap-3 overflow-hidden">
            <PayrollSurface className="space-y-2">
              <PayrollSectionHeader title="خلاصه محاسبات" />
              <div className="grid gap-2">
                <PayrollStat label="جمع دریافتی" value={formatMoney(totals.gross)} />
                <PayrollStat label="جمع کسورات" value={formatMoney(totals.deductions)} />
                <PayrollStat label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
              </div>
            </PayrollSurface>
            <PayrollSurface className="space-y-2">
              <PayrollSectionHeader title="عملیات" subtitle="صدور و تایید از لیست دوره انجام می‌شود" />
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">برای حفظ گردش‌کار (draft/approved/issued/cancelled)، فقط ذخیره این فرم فعال است.</div>
            </PayrollSurface>
            <PayrollSurface className="space-y-2">
              <PayrollSectionHeader title="ضمیمه PDF" />
              <div className="flex flex-wrap items-center gap-2">
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <Button size="sm" variant="secondary" onClick={() => pdfInputRef.current?.click()}>انتخاب فایل PDF</Button>
                {file && <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"><FileText className="h-4 w-4 text-slate-500" /><span>{file.name}</span><button type="button" className="rounded p-0.5 text-rose-600 hover:bg-rose-100" onClick={clearPdfFile} aria-label="پاک کردن فایل" title="پاک کردن فایل"><X className="h-3.5 w-3.5" /></button></div>}
                <Button size="sm" variant="secondary" disabled={!file || busy || !onUploadPdf} onClick={handleUploadPdf}>{busy ? 'در حال ارسال...' : 'آپلود PDF'}</Button>
              </div>
            </PayrollSurface>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

function ItemTable({ title, items = [], onChange, payslip, tone = 'slate', maxBodyHeightClass = 'max-h-44' }) {
  if (!items.length) return null
  const toneClass = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/40' : tone === 'rose' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
  return (
    <PayrollSurface className={`min-h-0 space-y-2 ${toneClass}`}>
      <PayrollSectionHeader title={title} />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className={`${maxBodyHeightClass} overflow-auto`}>
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500"><tr><th className="px-3 py-2">آیتم</th><th className="w-44 px-3 py-2">مقدار</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const source = String(item.source || item.key)
                return <tr key={item.key}><td className="px-3 py-2 font-bold text-slate-700">{item.label}</td><td className="px-3 py-2"><Input type="number" value={resolveInputValueFromPayslip(payslip, item)} onChange={(event) => onChange(source, Number(event.target.value || 0))} /></td></tr>
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PayrollSurface>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function formatEmployeeOption(employee = {}) {
  const fullName = String(employee?.fullName || employee?.name || '').trim() || 'بدون نام'
  return `${fullName} (${toPN(resolveEmployeeCode(employee) || 'بدون کد')})`
}
