import { useState } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import DatePicker from 'react-multi-date-picker'
import { Button, Card, Input } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { buildRunSummary, formatMaybeDate, formatMoney, getPaymentMeta, getRunStatusMeta, monthLabel } from './payrollMath'

export function PayrollRunsPanel({
  busyKey,
  canApprove,
  canIssue,
  canManage,
  onCreateRun,
  onEditPayslip,
  onPrint,
  onRunAction,
  onSelectRun,
  runs,
  selectedRun,
  selectedRunId,
}) {
  const summary = buildRunSummary(selectedRun || {})
  const draftPayslips = selectedRun?.payslips?.filter((payslip) => payslip.status === 'draft') || []
  const approvedPayslips = selectedRun?.payslips?.filter((payslip) => payslip.status === 'approved') || []

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">دوره های حقوق و دستمزد</div>
            <div className="text-xs font-bold text-slate-500">ایجاد ماهانه، بازبینی فیش ها و صدور نهایی</div>
          </div>
          {canManage && <RunCreateForm busy={busyKey === 'run'} onCreateRun={onCreateRun} />}
        </div>

        <div className="grid gap-3 lg:grid-cols-[.92fr_1.08fr]">
          <div className="space-y-2">
            {runs.map((run) => {
              const meta = getRunStatusMeta(run.status)
              const runSummary = run.summary || buildRunSummary(run)
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => onSelectRun(run.id)}
                  className={`w-full rounded-2xl border p-4 text-start transition-colors ${selectedRunId === run.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">{run.title || `لیست حقوق ${monthLabel(run.periodKey)}`}</div>
                      <div className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${selectedRunId === run.id ? 'border-white/20 bg-white/10 text-white' : meta.tone}`}>
                        {meta.label}
                      </div>
                    </div>
                    <div className="text-xs font-bold opacity-80">{toPN(runSummary.employees)} نفر</div>
                  </div>
                  <div className={`mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold ${selectedRunId === run.id ? 'text-white/80' : 'text-slate-500'}`}>
                    <Metric label="خالص" value={formatMoney(runSummary.net)} />
                    <Metric label="پرداخت" value={formatMoney(runSummary.paid)} />
                    <Metric label="مانده" value={formatMoney(runSummary.due)} />
                  </div>
                </button>
              )
            })}
            {runs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs font-bold text-slate-400">هنوز دوره ای ثبت نشده است.</div>}
          </div>

          <Card padding="md" tone="muted" className="space-y-4">
            {selectedRun ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-black text-slate-900">{selectedRun.title || `لیست حقوق ${monthLabel(selectedRun.periodKey)}`}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">تاریخ صدور: {formatMaybeDate(selectedRun.issuedAt)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canApprove && draftPayslips.length > 0 && <Button size="sm" variant="secondary" disabled={busyKey === 'action:approve'} onClick={() => onRunAction({ id: selectedRun.id, action: 'approve' })}>تایید دوره</Button>}
                    {canIssue && approvedPayslips.length > 0 && <Button size="sm" variant="primary" disabled={busyKey === 'action:issue'} onClick={() => onRunAction({ id: selectedRun.id, action: 'issue' })}>صدور دوره</Button>}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <SummaryChip label="پرسنل" value={toPN(summary.employees)} />
                  <SummaryChip label="جمع ناخالص" value={formatMoney(summary.gross)} />
                  <SummaryChip label="جمع خالص" value={formatMoney(summary.net)} />
                  <SummaryChip label="مانده پرداخت" value={formatMoney(summary.due)} />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                      <tr>
                        <th className="px-3 py-2">پرسنل</th>
                        <th className="px-3 py-2">خالص</th>
                        <th className="px-3 py-2">وضعیت پرداخت</th>
                        <th className="px-3 py-2">وضعیت فیش</th>
                        <th className="px-3 py-2">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRun.payslips?.map((payslip) => {
                        const paymentMeta = getPaymentMeta(payslip.paymentStatus)
                        const statusMeta = getRunStatusMeta(payslip.status)
                        return (
                          <tr key={payslip.id || payslip.employeeId} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <div className="font-black text-slate-900">{payslip.employeeName}</div>
                              <div className="text-[11px] font-bold text-slate-500">{toPN(payslip.employeeCode || '-')}</div>
                            </td>
                            <td className="px-3 py-2 font-black text-slate-900">{formatMoney(payslip.net)}</td>
                            <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${paymentMeta.tone}`}>{paymentMeta.label}</span></td>
                            <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusMeta.tone}`}>{statusMeta.label}</span></td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {canManage && <Button size="sm" variant="ghost" onClick={() => onEditPayslip(payslip)}>ویرایش</Button>}
                                {canApprove && payslip.status === 'draft' && <Button size="sm" variant="secondary" onClick={() => onRunAction({ id: selectedRun.id, payslipId: payslip.id, action: 'approve' })}>تایید</Button>}
                                {canIssue && payslip.status === 'approved' && <Button size="sm" variant="primary" onClick={() => onRunAction({ id: selectedRun.id, payslipId: payslip.id, action: 'issue' })}>صدور</Button>}
                                <Button size="sm" variant="ghost" onClick={() => onPrint(payslip)}>چاپ</Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {selectedRun.payslips?.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center font-bold text-slate-400">برای این دوره فیشی ثبت نشده است.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm font-bold text-slate-400">یک دوره را برای مشاهده جزییات انتخاب کنید.</div>
            )}
          </Card>
        </div>
      </Card>
    </div>
  )
}

function RunCreateForm({ busy, onCreateRun }) {
  const [periodKey, setPeriodKey] = useState(() => toShamsiMonthKey(new Date()))
  const [title, setTitle] = useState('')

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onCreateRun({ periodKey, title })
        setTitle('')
      }}
    >
      <ShamsiMonthPicker value={periodKey} onChange={setPeriodKey} />
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان اختیاری" className="sm:w-48" />
      <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'در حال ایجاد...' : 'دوره جدید'}</Button>
    </form>
  )
}

function ShamsiMonthPicker({ value, onChange }) {
  const pickerValue = value ? toPickerValue(value) : null
  return (
    <DatePicker
      value={pickerValue}
      onChange={(dateObj) => onChange(dateObj ? toShamsiMonthKey(dateObj) : '')}
      calendar={persian}
      locale={persianFa}
      calendarPosition="bottom-right"
      format="YYYY/MM"
      onlyMonthPicker
      editable={false}
      inputClass="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 cursor-pointer sm:w-40"
      placeholder="انتخاب ماه"
    />
  )
}

function toPickerValue(periodKey) {
  try {
    const [year, month] = String(periodKey || '').split('-')
    if (!year || !month) return null
    return new DateObject({ year: Number(year), month: Number(month), day: 1, calendar: persian, locale: persianFa })
  } catch {
    return null
  }
}

function toShamsiMonthKey(value) {
  try {
    const source = value instanceof DateObject ? value : new DateObject({ date: value, calendar: gregorian, locale: gregorianEn })
    const jalali = new DateObject(source).convert(persian, persianFa)
    return `${String(jalali.year).padStart(4, '0')}-${String(jalali.month.number).padStart(2, '0')}`
  } catch {
    return ''
  }
}

function SummaryChip({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>
}

function Metric({ label, value }) {
  return <div><div>{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>
}
