import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useAccReports } from '../../hooks/useAccReports'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { ShamsiDateInput } from '../../utils/dateUtils'

function fmtAmt(v) {
  return toPN(Number(v).toLocaleString())
}

export function PnlSummaryReport() {
  const { fiscalYears, currentDefault } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState(currentDefault?.id ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data, loading, error, fetch } = useAccReports()

  const handleRun = () => {
    if (!fiscalYearId) return alert('لطفاً سال مالی را انتخاب کنید.')
    fetch({ report: 'pnl_summary', fiscalYearId,
      ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) })
  }

  const revenueDetails = data?.details?.filter((d) => d.accountType === 'revenue') ?? []
  const expenseDetails = data?.details?.filter((d) => d.accountType === 'expense') ?? []

  return (
    <Card padding="md" className="space-y-4">
      <div className="text-sm font-black text-slate-900">خلاصه درآمد و هزینه (سود و زیان)</div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">سال مالی</label>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
            <option value="">-- انتخاب --</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">از تاریخ</label>
          <ShamsiDateInput value={dateFrom} onChange={setDateFrom} />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">تا تاریخ</label>
          <ShamsiDateInput value={dateTo} onChange={setDateTo} />
        </div>
        <Button variant="primary" onClick={handleRun} disabled={loading}>
          {loading ? 'در حال محاسبه...' : 'محاسبه سود/زیان'}
        </Button>
      </div>

      {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="text-[11px] font-bold text-emerald-600">جمع درآمد</div>
              <div className="mt-1 text-base font-black tabular-nums text-emerald-800">{fmtAmt(data.totalRevenue)}</div>
              <div className="text-[10px] text-emerald-600">ریال</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <div className="text-[11px] font-bold text-rose-600">جمع هزینه</div>
              <div className="mt-1 text-base font-black tabular-nums text-rose-800">{fmtAmt(data.totalExpense)}</div>
              <div className="text-[10px] text-rose-600">ریال</div>
            </div>
            <div className={`rounded-lg p-3 ${data.netIncome >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
              <div className={`text-[11px] font-bold ${data.netIncome >= 0 ? 'text-blue-600' : 'text-amber-700'}`}>
                {data.netIncome >= 0 ? 'سود خالص' : 'زیان خالص'}
              </div>
              <div className={`mt-1 text-base font-black tabular-nums ${data.netIncome >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
                {fmtAmt(Math.abs(data.netIncome))}
              </div>
              <div className={`text-[10px] ${data.netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>ریال</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-black text-emerald-700 mb-2">جزئیات درآمد</div>
              <table className="w-full text-right text-xs">
                <tbody className="divide-y divide-slate-100">
                  {revenueDetails.map((d) => (
                    <tr key={d.accountId} className="hover:bg-slate-50">
                      <td className="py-1.5 text-slate-700">{d.code} — {d.name}</td>
                      <td className="py-1.5 tabular-nums font-black text-emerald-700 text-left">{fmtAmt(d.amount)}</td>
                    </tr>
                  ))}
                  {revenueDetails.length === 0 && <tr><td colSpan={2} className="py-2 text-center text-slate-400">—</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <div className="text-xs font-black text-rose-700 mb-2">جزئیات هزینه</div>
              <table className="w-full text-right text-xs">
                <tbody className="divide-y divide-slate-100">
                  {expenseDetails.map((d) => (
                    <tr key={d.accountId} className="hover:bg-slate-50">
                      <td className="py-1.5 text-slate-700">{d.code} — {d.name}</td>
                      <td className="py-1.5 tabular-nums font-black text-rose-700 text-left">{fmtAmt(d.amount)}</td>
                    </tr>
                  ))}
                  {expenseDetails.length === 0 && <tr><td colSpan={2} className="py-2 text-center text-slate-400">—</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
