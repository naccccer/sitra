import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useAccReports } from '../../hooks/useAccReports'
import { useFiscalYears } from '../../hooks/useFiscalYears'

function fmtAmt(v) {
  if (!v) return '-'
  return toPN(Number(v).toLocaleString())
}

export function TrialBalanceReport() {
  const { fiscalYears, currentDefault } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState(currentDefault?.id ?? '')
  const [dateTo, setDateTo] = useState('')
  const { data, loading, error, fetch } = useAccReports()

  const handleRun = () => {
    if (!fiscalYearId) return alert('لطفاً سال مالی را انتخاب کنید.')
    fetch({ report: 'trial_balance', fiscalYearId, ...(dateTo ? { dateTo } : {}) })
  }

  const rows = data?.rows ?? []
  const levelColors = ['', 'font-black text-slate-900', 'font-bold text-slate-700', 'text-slate-600', 'text-slate-500']

  return (
    <Card padding="md" className="space-y-4">
      <div className="text-sm font-black text-slate-900">تراز آزمایشی</div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">سال مالی</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}
          >
            <option value="">-- انتخاب --</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-600 mb-1">تا تاریخ</label>
          <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button variant="primary" onClick={handleRun} disabled={loading}>
          {loading ? 'در حال محاسبه...' : 'تهیه تراز'}
        </Button>
        {data && (
          <span className={`text-xs font-bold ${data.isBalanced ? 'text-emerald-700' : 'text-rose-600'}`}>
            {data.isBalanced ? 'تراز متوازن است ✓' : 'تراز متوازن نیست!'}
          </span>
        )}
      </div>

      {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام حساب</th>
                <th className="px-3 py-2 text-left">بدهکار</th>
                <th className="px-3 py-2 text-left">بستانکار</th>
                <th className="px-3 py-2 text-left">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.accountId} className="hover:bg-slate-50"
                    style={{ backgroundColor: row.level === 1 ? '#f8fafc' : undefined }}>
                  <td className={`px-3 py-1.5 font-mono ${levelColors[row.level] ?? ''}`}>{row.code}</td>
                  <td className={`px-3 py-1.5 ${levelColors[row.level] ?? ''}`}
                      style={{ paddingRight: `${(row.level - 1) * 16 + 12}px` }}>
                    {row.name}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-left">{fmtAmt(row.debitTotal)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-left">{fmtAmt(row.creditTotal)}</td>
                  <td className={`px-3 py-1.5 tabular-nums text-left font-black ${row.balance < 0 ? 'text-rose-600' : ''}`}>
                    {fmtAmt(Math.abs(row.balance))}
                    {row.balance !== 0 && (
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        {row.balanceSide === 'debit' ? 'بد' : 'بس'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-slate-700">
              <tr>
                <td colSpan={2} className="px-3 py-2">جمع کل</td>
                <td className="px-3 py-2 tabular-nums text-left">{fmtAmt(data?.totalDebit)}</td>
                <td className="px-3 py-2 tabular-nums text-left">{fmtAmt(data?.totalCredit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
