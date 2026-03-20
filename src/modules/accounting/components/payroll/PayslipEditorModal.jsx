import { useMemo, useState } from 'react'
import { Button, Input, ModalShell } from '@/components/shared/ui'
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

export function PayslipEditorModal({ busy, onClose, onSave, onUploadPdf, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [file, setFile] = useState(null)
  const totals = useMemo(() => calculatePayslipTotals(draft ?? payslip), [draft, payslip])

  if (!payslip) return null

  return (
    <ModalShell
      isOpen={Boolean(payslip)}
      onClose={onClose}
      title={`ویرایش فیش ${payslip.employeeName}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-4xl"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-500">جمع خالص قابل پرداخت: <span className="font-black text-slate-900">{formatMoney(totals.net)}</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={() => onSave(draft)}>{busy ? 'در حال ذخیره...' : 'ذخیره فیش'}</Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <Info label="کد پرسنلی" value={payslip.employeeCode || '-'} />
          <Info label="واحد" value={payslip.department || '-'} />
          <Info label="وضعیت فیش" value={payslip.status || 'draft'} />
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

function Info({ label, value }) {
  return <div><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>
}

function InfoCard({ label, value, emphasize = false }) {
  return <div className={`rounded-2xl border px-3 py-3 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-1 text-base font-black">{value}</div></div>
}
