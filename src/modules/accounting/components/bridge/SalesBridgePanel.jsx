import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { accountingApi } from '../../services/accountingApi'

export function SalesBridgePanel({ session }) {
  const permissions = session?.permissions ?? []
  const canRun = permissions.includes('accounting.sales_bridge.run')

  const { fiscalYears, currentDefault } = useFiscalYears()

  const [fiscalYearId, setFiscalYearId] = useState(currentDefault?.id ?? '')
  const [mode, setMode] = useState('range')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [orderId, setOrderId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    if (!fiscalYearId) return alert('لطفاً سال مالی را انتخاب کنید.')
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const data = await accountingApi.runBridge({
        fiscalYearId,
        mode,
        ...(mode === 'order' ? { orderId: Number(orderId) } : { dateFrom, dateTo }),
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <div className="text-sm font-black text-slate-900">همگام‌سازی پرداخت‌های فروش</div>
        <div className="mt-1 text-xs font-bold text-slate-500">
          پرداخت‌های ثبت‌شده در ماژول فروش را به اسناد حسابداری تبدیل می‌کند. ایمپدمپوتنت است — هر پرداخت فقط یک‌بار سند ایجاد می‌کند.
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">سال مالی *</label>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
            <option value="">-- انتخاب --</option>
            {fiscalYears.filter((f) => f.status === 'open').map((f) =>
              <option key={f.id} value={f.id}>{f.title}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">حالت</label>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="range">بازه تاریخی</option>
            <option value="order">یک سفارش</option>
          </select>
        </div>

        {mode === 'range' && (
          <>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1">از تاریخ</label>
              <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
                value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1">تا تاریخ</label>
              <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
                value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </>
        )}

        {mode === 'order' && (
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1">شماره سفارش</label>
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 w-32"
              type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID سفارش" />
          </div>
        )}
      </div>

      {canRun && (
        <Button variant="primary" onClick={handleRun} disabled={running}>
          {running ? 'در حال همگام‌سازی...' : 'اجرای همگام‌سازی'}
        </Button>
      )}

      {error && <div className="rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700">خطا: {error}</div>}

      {result && (
        <div className={`rounded-lg p-4 text-xs space-y-2 ${result.errors?.length ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <div className="font-black text-slate-900">نتیجه همگام‌سازی</div>
          <div className="flex gap-6">
            <div>
              <div className="text-slate-500">اسناد ایجاد شده</div>
              <div className="text-lg font-black text-emerald-700">{toPN(result.created)}</div>
            </div>
            <div>
              <div className="text-slate-500">رد شده (قبلاً ثبت)</div>
              <div className="text-lg font-black text-slate-600">{toPN(result.skipped)}</div>
            </div>
            {result.errors?.length > 0 && (
              <div>
                <div className="text-slate-500">خطا</div>
                <div className="text-lg font-black text-rose-700">{toPN(result.errors.length)}</div>
              </div>
            )}
          </div>
          {result.errors?.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.errors.map((e, i) => (
                <div key={i} className="text-rose-600">{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
