import { useState } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import DatePicker from 'react-multi-date-picker'
import { Button, Input } from '@/components/shared/ui'
import { buildRunSummary, formatMoney, formatNumber, getPaymentMeta, getRunStatusMeta, monthLabel } from './payrollMath'
import { PayrollStageFrame } from './PayrollStageFrame'

function getWorkflowMeta(state) {
  if (state === 'finalized') {
    return { label: 'نهایی شده', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
  if (state === 'ready_to_finalize') {
    return { label: 'آماده نهایی‌سازی', tone: 'bg-blue-50 text-blue-700 border-blue-200' }
  }
  return { label: 'در حال تکمیل', tone: 'bg-amber-50 text-amber-700 border-amber-200' }
}

function resolveRunWorkflowMeta(run, selectedRun, workspace) {
  if (selectedRun?.id && run?.id === selectedRun.id) {
    return getWorkflowMeta(workspace?.workflowState || 'in_progress')
  }
  return getRunStatusMeta(run?.status)
}

function resolveRunSettlementMeta(run, selectedRun, workspace) {
  if (selectedRun?.id && run?.id === selectedRun.id) {
    return getPaymentMeta(workspace?.summary?.settlementStatus || 'unpaid')
  }
  const summary = run?.summary || buildRunSummary(run)
  const net = Number(summary?.net || 0)
  const due = Number(summary?.due || 0)
  const paymentState = due <= 0 ? 'paid' : due >= net ? 'unpaid' : 'partial'
  return getPaymentMeta(paymentState)
}

export function PayrollRunsPanel({
  busyKey,
  canManage,
  onCreateRun,
  onSelectRun,
  runs,
  selectedRun,
  selectedRunId,
  workspace,
}) {
  const createForm = canManage ? <RunCreateForm busy={busyKey === 'run'} onCreateRun={onCreateRun} onSelectRun={onSelectRun} runs={runs} /> : null

  return (
    <PayrollStageFrame
      stageNumber="1"
      title="انتخاب یا ایجاد دوره"
      subtitle="برای هر ماه یک دوره انتخاب کنید و کل جریان ساخت، بازبینی و نهایی‌سازی را داخل همان دوره ادامه دهید."
      tone="slate"
      actions={createForm}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-3 py-2">دوره</th>
              <th className="px-3 py-2">وضعیت</th>
              <th className="px-3 py-2">تسویه</th>
              <th className="px-3 py-2">پرسنل</th>
              <th className="px-3 py-2">خالص</th>
              <th className="px-3 py-2">مانده</th>
              <th className="px-3 py-2">انتخاب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map((run) => {
              const runSummary = run.summary || buildRunSummary(run)
              const workflowMeta = resolveRunWorkflowMeta(run, selectedRun, workspace)
              const settlementMeta = resolveRunSettlementMeta(run, selectedRun, workspace)
              return (
                <tr key={run.id} className={selectedRunId === run.id ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2">
                    <div className="font-black text-slate-900">{run.title || `لیست حقوق ${monthLabel(run.periodKey)}`}</div>
                    <div className="text-[11px] font-bold text-slate-500">{run.periodKey || '-'}</div>
                  </td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${workflowMeta.tone}`}>{workflowMeta.label}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${settlementMeta.tone}`}>{settlementMeta.label}</span></td>
                  <td className="px-3 py-2 font-bold text-slate-600">{formatNumber(runSummary.employees)} نفر</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(runSummary.net)}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(runSummary.due)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant={selectedRunId === run.id ? 'primary' : 'secondary'} onClick={() => onSelectRun(run.id)}>
                      {selectedRunId === run.id ? 'انتخاب شده' : 'انتخاب'}
                    </Button>
                  </td>
                </tr>
              )
            })}
            {runs.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center font-bold text-slate-400">هنوز دوره‌ای ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PayrollStageFrame>
  )
}

function RunCreateForm({ busy, onCreateRun, onSelectRun, runs = [] }) {
  const [periodKey, setPeriodKey] = useState(() => toShamsiMonthKey(new Date()))
  const [title, setTitle] = useState('')
  const [localError, setLocalError] = useState('')
  const [localNotice, setLocalNotice] = useState('')

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        const normalizedPeriodKey = String(periodKey || '').trim()
        if (!normalizedPeriodKey) {
          setLocalNotice('')
          setLocalError('ابتدا ماه دوره را انتخاب کنید.')
          return
        }
        const duplicate = runs.find((item) => String(item.periodKey) === normalizedPeriodKey)
        if (duplicate?.id) {
          setLocalNotice('')
          onSelectRun(duplicate.id)
          setLocalError('این دوره قبلا ثبت شده و انتخاب شد.')
          return
        }
        try {
          setLocalNotice('')
          setLocalError('')
          const result = await onCreateRun({ periodKey: normalizedPeriodKey, title })
          if (result?.reused) {
            setLocalNotice('این دوره از قبل وجود داشت و انتخاب شد.')
          } else {
            setLocalNotice('دوره با موفقیت ایجاد و انتخاب شد.')
          }
          setTitle('')
        } catch (error) {
          setLocalNotice('')
          const message = String(error?.message || '').trim()
          setLocalError(message || 'ایجاد دوره انجام نشد. دوباره تلاش کنید.')
        }
      }}
    >
      <ShamsiMonthPicker value={periodKey} onChange={(value) => {
        setPeriodKey(value)
        setLocalError('')
        setLocalNotice('')
      }}
      />
      <Input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setLocalError('')
          setLocalNotice('')
        }}
        placeholder="عنوان اختیاری"
        className="sm:w-48"
      />
      <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'در حال ایجاد...' : 'دوره جدید'}</Button>
      {localError && <span className="text-xs font-bold text-amber-700">{localError}</span>}
      {localNotice && <span className="text-xs font-bold text-emerald-700">{localNotice}</span>}
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
