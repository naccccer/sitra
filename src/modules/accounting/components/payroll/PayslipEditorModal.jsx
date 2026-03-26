import { useMemo, useState } from 'react'
import { Button, Input, ModalShell } from '@/components/shared/ui'
import { calculatePayslipTotals, formatMoney } from './payrollMath'
import { calculateCatalogTotals, resolveInputValueFromPayslip, splitCatalogByType } from './payrollCatalog'

function updateDraftInput(draft, source, value) {
  return {
    ...draft,
    [source]: value,
    inputs: {
      ...(draft.inputs || {}),
      [source]: value,
    },
  }
}

export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [showNotes, setShowNotes] = useState(Boolean(payslip?.notes))

  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const selectedEmployee = useMemo(() => employeeMap.get(String(draft?.employeeId ?? '')) || null, [draft?.employeeId, employeeMap])

  const totals = useMemo(() => {
    const fallback = calculatePayslipTotals(draft ?? payslip)
    const catalogTotals = calculateCatalogTotals(draft ?? payslip, catalog)
    if (catalogTotals.gross === 0 && catalogTotals.deductions === 0) return fallback
    return catalogTotals
  }, [catalog, draft, payslip])

  const scopedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])
  if (!payslip) return null

  const employeeName = selectedEmployee?.fullName || selectedEmployee?.name || draft?.employeeName || payslip?.employeeName || ''
  const handleSave = () => {
    const employeeId = String(draft?.employeeId || '').trim()
    const employee = employeeMap.get(employeeId)

    onSave({
      ...draft,
      employeeId,
      employeeName: employee?.fullName || employee?.name || draft?.employeeName || '',
      employeeCode: resolveEmployeeCode(employee) || draft?.employeeCode || '',
      department: employee?.department || draft?.department || '',
    })
  }

  return (
    <ModalShell
      isOpen={Boolean(payslip)}
      onClose={onClose}
      title={`فیش حقوق ${employeeName || 'بدون نام'}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-5xl"
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
        <ItemTable
          title="کارکرد و اطلاعات"
          items={[...scopedCatalog.info, ...scopedCatalog.work]}
          payslip={draft}
          onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
          maxBodyHeightClass="max-h-48"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <ItemTable
            title="دریافتی‌ها"
            items={scopedCatalog.earning}
            payslip={draft}
            onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
            tone="emerald"
            maxBodyHeightClass="max-h-40"
          />
          <ItemTable
            title="کسورات"
            items={scopedCatalog.deduction}
            payslip={draft}
            onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
            tone="rose"
            maxBodyHeightClass="max-h-40"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <InfoCard label="جمع دریافتی" value={formatMoney(totals.gross)} compact />
          <InfoCard label="جمع کسورات" value={formatMoney(totals.deductions)} compact />
          <InfoCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize compact />
        </div>

        {!showNotes ? (
          <div className="flex justify-start">
            <Button size="sm" variant="secondary" onClick={() => setShowNotes(true)}>افزودن یادداشت</Button>
          </div>
        ) : (
          <label className="block space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-xs font-black text-slate-600">یادداشت</span>
              <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}>بستن یادداشت</Button>
            </div>
            <textarea
              value={draft?.notes || ''}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            />
          </label>
        )}
      </div>
    </ModalShell>
  )
}

function ItemTable({ title, items = [], onChange, payslip, tone = 'slate', maxBodyHeightClass = 'max-h-44' }) {
  if (!items.length) return null
  const toneClass = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/40' : tone === 'rose' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${toneClass}`}>
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className={maxBodyHeightClass + ' overflow-auto'}>
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
        </div>
      </div>
    </div>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function InfoCard({ label, value, emphasize = false, compact = false }) {
  const compactClass = compact ? 'px-2 py-1.5' : 'px-3 py-2'
  return <div className={`rounded-xl border ${compactClass} ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div className={`text-[10px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-0.5 text-xs font-black">{value}</div></div>
}
