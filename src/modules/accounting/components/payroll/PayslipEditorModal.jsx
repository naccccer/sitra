import { useEffect, useMemo, useState } from 'react'
import { Button, Input, ModalShell } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { calculatePayslipTotals, formatMoney } from './payrollMath'
import { calculateCatalogTotals, resolveInputValueFromPayslip, splitCatalogByType } from './payrollCatalog'
import { PayrollMetricCard } from './PayrollMetricCard'
import { PayrollScrollableTableCard } from './PayrollScrollableTableCard'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'

function updateDraftInput(draft, source, value) {
  return { ...draft, [source]: value, inputs: { ...(draft.inputs || {}), [source]: value } }
}

export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [error, setError] = useState('')
  const [showNotes, setShowNotes] = useState(Boolean(payslip?.notes))

  useEffect(() => {
    setDraft(payslip)
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

  return (
    <ModalShell
      isOpen={Boolean(payslip)}
      onClose={onClose}
      title={`فیش حقوق ${employeeName || 'بدون نام'}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-4xl"
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
      <div className="space-y-3">
        <PayrollSurfaceCard className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-end" tone="muted">
          <label className="space-y-1">
            <span className="block text-xs font-black text-slate-600">پرسنل</span>
            <Input value={employeeQuery || formatEmployeeOption({ fullName: employeeName, employeeCode })} onChange={(event) => handleEmployeeFieldChange(event.target.value)} placeholder="انتخاب یا جستجوی پرسنل" list="payslip-editor-employees" className="text-right" dir="rtl" />
            <datalist id="payslip-editor-employees">{employeeList.map((employee) => <option key={String(employee.id)} value={formatEmployeeOption(employee)} />)}</datalist>
            {error && <span className="block text-xs font-bold text-rose-600">{error}</span>}
          </label>
          <Tiny label="کد پرسنلی" value={toPN(employeeCode || '-')} />
          <Tiny label="واحد" value={employeeDepartment || '-'} />
          <Tiny label="وضعیت" value={draft?.status || payslip.status || 'draft'} />
        </PayrollSurfaceCard>

        <div className="grid gap-2 sm:grid-cols-3">
          <PayrollMetricCard label="جمع دریافتی" value={formatMoney(totals.gross)} />
          <PayrollMetricCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
          <PayrollMetricCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasis />
        </div>

        <ItemTable title="کارکرد و اطلاعات" items={[...scopedCatalog.info, ...scopedCatalog.work]} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} />
        <ItemTable title="دریافتی‌ها" items={scopedCatalog.earning} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} tone="emerald" />
        <ItemTable title="کسورات" items={scopedCatalog.deduction} payslip={draft} onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))} tone="rose" />

        <label className="block space-y-1">
          <span className="block text-xs font-black text-slate-600">یادداشت</span>
          <textarea value={draft?.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
        </label>

      </div>
    </ModalShell>
  )
}

function ItemTable({ title, items = [], onChange, payslip, tone = 'slate' }) {
  if (!items.length) return null
  const toneClass = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/40' : tone === 'rose' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
  return (
    <PayrollSurfaceCard className={`space-y-2 ${toneClass}`}>
      <div className="text-sm font-black text-slate-900">{title}</div>
      <PayrollScrollableTableCard maxHeightClass="max-h-80">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500"><tr><th className="px-3 py-2">آیتم</th><th className="px-3 py-2 w-48">مقدار</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const source = String(item.source || item.key)
              return (
                <tr key={item.key}>
                  <td className="px-3 py-2 font-bold text-slate-700">{item.label}</td>
                  <td className="px-3 py-2"><Input type="number" value={resolveInputValueFromPayslip(payslip, item)} onChange={(event) => onChange(source, Number(event.target.value || 0))} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PayrollScrollableTableCard>
    </PayrollSurfaceCard>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function formatEmployeeOption(employee = {}) {
  const fullName = String(employee?.fullName || employee?.name || '').trim() || 'بدون نام'
  const employeeCode = resolveEmployeeCode(employee)
  return `${fullName} (${toPN(employeeCode || 'بدون کد')})`
}

function Tiny({ label, value }) {
  return (
    <PayrollSurfaceCard density="compact" className="text-center">
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </PayrollSurfaceCard>
  )
}
