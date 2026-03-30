import { useMemo, useState } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import DatePicker from 'react-multi-date-picker'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button, Input } from '@/components/shared/ui'
import { buildRunSummary, formatMoney, formatNumber, getPaymentMeta, getRunStatusMeta } from './payrollMath'
import { formatPayrollPeriodTitle } from './payrollPeriodTitle'
import { PayrollStageFrame } from './PayrollStageFrame'

function getWorkflowMeta(state) {
  if (state === 'finalized') return { label: 'نهایی شده', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (state === 'ready_to_finalize') return { label: 'آماده نهایی‌سازی', tone: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { label: 'در حال تکمیل', tone: 'bg-amber-50 text-amber-700 border-amber-200' }
}

function resolveRunWorkflowMeta(run, selectedRun, workspace) {
  return selectedRun?.id && run?.id === selectedRun.id ? getWorkflowMeta(workspace?.workflowState || 'in_progress') : getRunStatusMeta(run?.status)
}

function resolveRunSettlementMeta(run, selectedRun, workspace) {
  if (selectedRun?.id && run?.id === selectedRun.id) return getPaymentMeta(workspace?.summary?.settlementStatus || 'unpaid')
  const summary = run?.summary || buildRunSummary(run)
  const net = Number(summary?.net || 0)
  const due = Number(summary?.due || 0)
  return getPaymentMeta(due <= 0 ? 'paid' : due >= net ? 'unpaid' : 'partial')
}

export function PayrollRunsPanel({ busyKey, canManage, onCreateRun, onSelectRun, runs, selectedRun, selectedRunId, workspace }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = String(query || '').trim().toLowerCase()
  const filteredRuns = useMemo(() => (
    normalizedQuery
      ? runs.filter((run) => {
          const title = formatPayrollPeriodTitle(run?.periodKey || run?.title || '').toLowerCase()
          const periodKey = String(run?.periodKey || '').toLowerCase()
          return title.includes(normalizedQuery) || periodKey.includes(normalizedQuery)
        })
      : runs
  ), [normalizedQuery, runs])

  return (
    <PayrollStageFrame
      title="دوره‌های حقوق"
      subtitle="ایجاد ماه جدید، مرور دوره‌های قبلی و ورود به فضای کار از همین صفحه انجام می‌شود."
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی دوره" className="sm:w-44" />
          {canManage ? <RunCreateForm busy={busyKey === 'run'} onCreateRun={onCreateRun} onSelectRun={onSelectRun} runs={runs} /> : null}
        </div>
      )}
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
              <th className="px-3 py-2 text-center">ورود</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRuns.map((run) => {
              const runSummary = run.summary || buildRunSummary(run)
              const workflowMeta = resolveRunWorkflowMeta(run, selectedRun, workspace)
              const settlementMeta = resolveRunSettlementMeta(run, selectedRun, workspace)
              const isSelected = selectedRunId === run.id
              return (
                <tr key={run.id} className={isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2">
                    <div className="font-black text-slate-900">{formatPayrollPeriodTitle(run.periodKey || run.title)}</div>
                    <div className="text-[11px] font-bold text-slate-500">{run.periodKey || '-'}</div>
                  </td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${workflowMeta.tone}`}>{workflowMeta.label}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${settlementMeta.tone}`}>{settlementMeta.label}</span></td>
                  <td className="px-3 py-2 font-bold text-slate-600">{formatNumber(runSummary.employees)} نفر</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(runSummary.net)}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(runSummary.due)}</td>
                  <td className="px-3 py-2 text-center">
                    <Button size="sm" variant={isSelected ? 'primary' : 'secondary'} onClick={() => onSelectRun(run.id)} className="gap-1.5">
                      <ArrowLeft className="h-4 w-4" />
                      {isSelected ? 'انتخاب شده' : 'انتخاب'}
                    </Button>
                  </td>
                </tr>
              )
            })}
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center font-bold text-slate-400">
                  {runs.length === 0 ? 'هنوز دوره‌ای ثبت نشده است.' : 'نتیجه‌ای برای این جستجو پیدا نشد.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PayrollStageFrame>
  )
}

function RunCreateForm({ busy, onCreateRun, onSelectRun, runs = [] }) {
  const [periodKey, setPeriodKey] = useState(() => toShamsiMonthKey(new Date()))
  const [localError, setLocalError] = useState('')
  const [localNotice, setLocalNotice] = useState('')
  const popupMessage = localError || localNotice
  const popupTone = localError ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <form
      className="relative"
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
          setLocalError('این دوره قبلا ثبت شده و فضای کار آن باز می‌شود.')
          onSelectRun(duplicate.id)
          return
        }
        try {
          setLocalError('')
          setLocalNotice('')
          await onCreateRun({ periodKey: normalizedPeriodKey })
          setLocalNotice('دوره ایجاد شد و فضای کار آن باز می‌شود.')
        } catch (error) {
          setLocalNotice('')
          setLocalError(String(error?.message || '').trim() || 'ایجاد دوره انجام نشد. دوباره تلاش کنید.')
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShamsiMonthPicker value={periodKey} onChange={(value) => {
          setPeriodKey(value)
          setLocalError('')
          setLocalNotice('')
        }}
        />
        <div className="min-w-[7.5rem] rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-100">
          {formatPayrollPeriodTitle(periodKey)}
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={busy} className="gap-2 border-white bg-white text-slate-900 shadow-md hover:bg-slate-100">
          <Plus className="h-4 w-4" />
          {busy ? 'در حال ایجاد...' : 'دوره جدید'}
        </Button>
      </div>
      {popupMessage ? (
        <div className={`absolute start-0 top-full z-20 mt-2 flex min-w-[280px] max-w-[360px] items-start justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-bold shadow-lg ${popupTone}`}>
          <div>{popupMessage}</div>
          <button
            type="button"
            className="rounded-lg p-1 opacity-70 transition hover:bg-white/70 hover:opacity-100"
            onClick={() => {
              setLocalError('')
              setLocalNotice('')
            }}
            aria-label="بستن پیام"
            title="بستن"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </form>
  )
}

function ShamsiMonthPicker({ value, onChange }) {
  return (
    <DatePicker
      value={value ? toPickerValue(value) : null}
      onChange={(dateObj) => onChange(dateObj ? toShamsiMonthKey(dateObj) : '')}
      calendar={persian}
      locale={persianFa}
      calendarPosition="bottom-right"
      format="YYYY/MM"
      onlyMonthPicker
      editable={false}
      inputClass="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 sm:w-40"
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
