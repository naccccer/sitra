import { useMemo, useState } from 'react'
import { Button, Input, ModalShell, Select } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { calculatePayslipTotals, formatMoney } from './payrollMath'

const EDIT_FIELDS = [
  ['baseSalary', 'حقوق پایه'],
  ['housingAllowance', 'حق مسکن'],
  ['foodAllowance', 'بن خواربار'],
  ['childAllowance', 'حق اولاد'],
  ['seniorityAllowance', 'سنوات'],
  ['overtimeHours', 'ساعت اضافه کار'],
  ['overtimePay', 'مبلغ اضافه کار'],
  ['bonus', 'پاداش'],
  ['otherAdditions', 'مزایای متفرقه'],
  ['insurance', 'بیمه'],
  ['tax', 'مالیات'],
  ['loanDeduction', 'اقساط / وام'],
  ['advanceDeduction', 'علی الحساب'],
  ['absenceDeduction', 'کسری کار / غیبت'],
  ['otherDeductions', 'سایر کسورات'],
]

export function PayslipEditorModal({ busy, employees = [], onClose, onSave, onUploadPdf, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const selectedEmployee = useMemo(() => employeeMap.get(String(draft?.employeeId ?? '')) || null, [draft?.employeeId, employeeMap])
  const totals = useMemo(() => calculatePayslipTotals(draft ?? payslip), [draft, payslip])

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
      title={`ویرایش فیش ${employeeName || 'بدون نام'}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-4xl"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-500">جمع خالص قابل پرداخت: <span className="font-black text-slate-900">{formatMoney(totals.net)}</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={handleSave}>{busy ? 'در حال ذخیره...' : 'ذخیره فیش'}</Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="block text-xs font-black text-slate-600">پرسنل</span>
          <Select value={String(draft?.employeeId || '')} onChange={(event) => handleEmployeeChange(String(event.target.value || ''))}>
            <option value="">انتخاب پرسنل</option>
            {draft?.employeeId && !hasValidEmployee && (
              <option value={String(draft.employeeId)}>{formatEmployeeOption({ fullName: draft.employeeName, employeeCode: draft.employeeCode })}</option>
            )}
            {employeeList.map((employee) => (
              <option key={String(employee.id)} value={String(employee.id)}>{formatEmployeeOption(employee)}</option>
            ))}
          </Select>
          {error && <span className="block text-xs font-bold text-rose-600">{error}</span>}
          {employeeList.length === 0 && <span className="block text-[11px] font-bold text-amber-700">لیست پرسنل از HR دریافت نشده است.</span>}
        </label>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <Info label="کد پرسنلی" value={toPN(employeeCode || '-')} />
          <Info label="واحد" value={employeeDepartment || '-'} />
          <Info label="وضعیت فیش" value={draft?.status || payslip.status || 'draft'} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EDIT_FIELDS.map(([field, label]) => (
            <label key={field} className="space-y-1">
              <span className="block text-xs font-black text-slate-600">{label}</span>
              <Input type="number" value={draft?.[field] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [field]: Number(event.target.value || 0) }))} />
            </label>
          ))}
        </div>

        <label className="block space-y-1">
          <span className="block text-xs font-black text-slate-600">یادداشت</span>
          <textarea value={draft?.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard label="جمع ناخالص" value={formatMoney(totals.gross)} />
          <InfoCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
          <InfoCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
        </div>

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

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function formatEmployeeOption(employee = {}) {
  const fullName = String(employee?.fullName || employee?.name || '').trim() || 'بدون نام'
  const employeeCode = resolveEmployeeCode(employee)
  return `${fullName} + ${toPN(employeeCode || 'بدون کد')}`
}

function Info({ label, value }) {
  return <div><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>
}

function InfoCard({ label, value, emphasize = false }) {
  return <div className={`rounded-2xl border px-3 py-3 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-1 text-base font-black">{value}</div></div>
}
