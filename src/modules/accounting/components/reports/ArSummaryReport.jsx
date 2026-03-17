import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useAccReports } from '../../hooks/useAccReports'
import { useFiscalYears } from '../../hooks/useFiscalYears'

function fmtAmt(v) {
  return toPN(Number(v).toLocaleString())
}

export function ArSummaryReport() {
  const { fiscalYears, currentDefault } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState(currentDefault?.id ?? '')
  const { data, loading, error, fetch } = useAccReports()

  const handleRun = () => {
    if (!fiscalYearId) return alert('لطفاً سال مالی را انتخاب کنید.')
    fetch({ report: 'ar_summary', fiscalYearId })
  }

  const rows = data?.rows ?? []

  return (
    <Card padding="md" className="space-y-4">
      <div className="text-sm font-black text-slate-900">مانده حساب مشتریان (حسابهای دریافتنی)</div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">سال مالی</label>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
            <option value="">-- انتخاب --</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
        <Button variant="primary" onClick={handleRun} disabled={loading}>
          {loading ? 'در حال محاسبه...' : 'نمایش مانده'}
        </Button>
      </div>

      {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}

      {data && (
        <div className="rounded-lg bg-blue-50 p-3 text-xs font-bold text-blue-700">
          جمع مانده دریافتنی: {fmtAmt(data.totalBalance)} ریال
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">مشتری</th>
                <th className="px-3 py-2 text-left">بدهکار</th>
                <th className="px-3 py-2 text-left">بستانکار</th>
                <th className="px-3 py-2 text-left">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.customerId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900">{row.customerName}</td>
                  <td className="px-3 py-2 tabular-nums text-left">{fmtAmt(row.debit)}</td>
                  <td className="px-3 py-2 tabular-nums text-left">{fmtAmt(row.credit)}</td>
                  <td className={`px-3 py-2 tabular-nums font-black text-left ${row.balance > 0 ? 'text-emerald-700' : row.balance < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {fmtAmt(Math.abs(row.balance))}
                    {row.balance !== 0 && (
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        {row.balance > 0 ? 'بد' : 'بس'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && rows.length === 0 && (
        <div className="text-center text-xs font-bold text-slate-400 py-8">داده‌ای یافت نشد.</div>
      )}
    </Card>
  )
}
