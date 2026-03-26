import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button, Input, ModalShell, Select } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
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

export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, onUploadPdf, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [employeeQuery, setEmployeeQuery] = useState('')
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const filteredEmployees = useMemo(() => {
    if (!employeeQuery.trim()) return employeeList
    const query = employeeQuery.trim().toLowerCase()
    return employeeList.filter((employee) => {
      const text = `${employee?.fullName || employee?.name || ''} ${resolveEmployeeCode(employee)}`.toLowerCase()
      return text.includes(query)
    })
  }, [employeeList, employeeQuery])
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
  const employeeCode = resolveEmployeeCode(selectedEmployee) || draft?.employeeCode || payslip?.employeeCode || ''
  const employeeDepartment = selectedEmployee?.department || draft?.department || payslip?.department || ''
  const hasValidEmployee = Boolean(draft?.employeeId) && employeeMap.has(String(draft?.employeeId))

  const handleEmployeeChange = (nextEmployeeId) => {
    const employee = employeeMap.get(nextEmployeeId)
    setDraft((current) => ({
      ...current,
      employeeId: nextEmployeeId,
      employeeName: employee?.fullName || employee?.name || '',
      employeeCode: resolveEmployeeCode(employee),
      department: employee?.department || '',
    }))
    setError('')
  }

  const handleSave = () => {
    const employeeId = String(draft?.employeeId || '').trim()
    if (!employeeId) {
      setError('لطفاً پرسنل را انتخاب کنید.')
      return
    }
    if (!employeeMap.has(employeeId)) {
      setError('پرسنل انتخاب‌شده معتبر نیست. لطفاً از لیست پرسنل انتخاب کنید.')
      return
    }
    const employee = employeeMap.get(employeeId)
    setError('')
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
      maxWidthClass="max-w-6xl"
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
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-600">انتخاب پرسنل</div>
            <label className="relative block">
              <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} className="pe-8" placeholder="جستجوی نام یا کد پرسنلی" />
            </label>
            <Select value={String(draft?.employeeId || '')} onChange={(event) => handleEmployeeChange(String(event.target.value || ''))}>
              <option value="">انتخاب پرسنل</option>
              {draft?.employeeId && !hasValidEmployee && (
                <option value={String(draft.employeeId)}>{formatEmployeeOption({ fullName: draft.employeeName, employeeCode: draft.employeeCode })}</option>
              )}
              {filteredEmployees.map((employee) => (
                <option key={String(employee.id)} value={String(employee.id)}>{formatEmployeeOption(employee)}</option>
              ))}
            </Select>
            {error && <span className="block text-xs font-bold text-rose-600">{error}</span>}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <InfoCard label="کد پرسنلی" value={toPN(employeeCode || '-')} />
            <InfoCard label="واحد" value={employeeDepartment || '-'} />
            <InfoCard label="وضعیت فیش" value={draft?.status || payslip.status || 'draft'} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard label="جمع دریافتی" value={formatMoney(totals.gross)} />
          <InfoCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
          <InfoCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
        </div>

        <ItemGrid
          title="کارکرد و اطلاعات ماه"
          items={[...scopedCatalog.info, ...scopedCatalog.work]}
          payslip={draft}
          onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
        />
        <ItemGrid
          title="دریافتی‌ها"
          items={scopedCatalog.earning}
          payslip={draft}
          onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
          tone="emerald"
        />
        <ItemGrid
          title="کسورات"
          items={scopedCatalog.deduction}
          payslip={draft}
          onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
          tone="rose"
        />

        <label className="block space-y-1">
          <span className="block text-xs font-black text-slate-600">یادداشت</span>
          <textarea value={draft?.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-black text-slate-900">بارگذاری PDF نهایی</div>
              <div className="text-xs font-bold text-slate-500">برای ضمیمه نسخه امضاشده یا فایل صادرشده</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input type="file" accept="application/pdf" className="h-10 max-w-64 cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              <Button size="sm" variant="secondary" disabled={!file || busy} onClick={() => onUploadPdf(file)}>{busy ? 'در حال ارسال...' : 'آپلود PDF'}</Button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

function ItemGrid({ title, items = [], onChange, payslip, tone = 'slate' }) {
  if (!items.length) return null
  const toneClass = tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50/40'
    : tone === 'rose'
      ? 'border-rose-200 bg-rose-50/40'
      : 'border-slate-200 bg-white'
  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${toneClass}`}>
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const source = String(item.source || item.key)
          return (
            <label key={item.key} className="space-y-1 rounded-xl border border-slate-200 bg-white p-2">
              <span className="block text-xs font-black text-slate-600">{item.label}</span>
              <Input
                type="number"
                value={resolveInputValueFromPayslip(payslip, item)}
                onChange={(event) => onChange(source, Number(event.target.value || 0))}
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function formatEmployeeOption(employee = {}) {
  const fullName = String(employee?.fullName || employee?.name || '').trim() || 'بدون نام'
  const employeeCode = resolveEmployeeCode(employee)
  return `${fullName} + ${toPN(employeeCode || 'بدون کد')}`
}

function InfoCard({ label, value, emphasize = false }) {
  return <div className={`rounded-2xl border px-3 py-3 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-1 text-base font-black">{value}</div></div>
}
