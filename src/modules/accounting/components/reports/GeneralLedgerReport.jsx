import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useAccReports } from '../../hooks/useAccReports'
import { useAccounts } from '../../hooks/useAccounts'
import { useFiscalYears } from '../../hooks/useFiscalYears'

function fmtAmt(v) {
  return toPN(Number(v).toLocaleString())
}

export function GeneralLedgerReport() {
  const { fiscalYears, currentDefault } = useFiscalYears()
  const { accounts } = useAccounts({ postableOnly: true })
  const [fiscalYearId, setFiscalYearId] = useState(currentDefault?.id ?? '')
  const [accountId, setAccountId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data, loading, error, fetch } = useAccReports()

  const handleRun = () => {
    if (!fiscalYearId) return alert('لطفاً سال مالی را انتخاب کنید.')
    if (!accountId) return alert('لطفاً حساب را انتخاب کنید.')
    fetch({ report: 'general_ledger', fiscalYearId, accountId,
      ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) })
  }

  const rows = data?.rows ?? []

  return (
    <Card padding="md" className="space-y-4">
      <div className="text-sm font-black text-slate-900">دفتر کل</div>
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
          <label className="block text-xs font-black text-slate-600 mb-1">حساب</label>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 min-w-[200px]"
            value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">-- انتخاب حساب --</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
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
        <Button variant="primary" onClick={handleRun} disabled={loading}>
          {loading ? 'در حال محاسبه...' : 'نمایش گردش'}
        </Button>
      </div>

      {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}

      {data?.account && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-700">
          {data.account.code} — {data.account.name} | مانده نهایی: {fmtAmt(Math.abs(data.closingBalance))}
          <span className="mr-1 text-slate-400">({data.account.accountNature === 'debit' ? 'بدهکار' : 'بستانکار'})</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">شماره سند</th>
                <th className="px-3 py-2">تاریخ</th>
                <th className="px-3 py-2">شرح</th>
                <th className="px-3 py-2 text-left">بدهکار</th>
                <th className="px-3 py-2 text-left">بستانکار</th>
                <th className="px-3 py-2 text-left">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono font-black">{toPN(row.voucherNo)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-600">{row.voucherDate}</td>
                  <td className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate">
                    {row.sourceCode ? `[${row.sourceCode}] ` : ''}{row.description}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums text-left">{row.debitAmount > 0 ? fmtAmt(row.debitAmount) : '-'}</td>
                  <td className="px-3 py-1.5 tabular-nums text-left">{row.creditAmount > 0 ? fmtAmt(row.creditAmount) : '-'}</td>
                  <td className="px-3 py-1.5 tabular-nums font-black text-left">
                    {fmtAmt(Math.abs(row.runningBalance))}
                    <span className="mr-1 text-[10px] font-bold text-slate-400">
                      {row.runningBalance >= 0 ? 'بد' : 'بس'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && rows.length === 0 && (
        <div className="text-center text-xs font-bold text-slate-400 py-8">تراکنشی برای این حساب یافت نشد.</div>
      )}
    </Card>
  )
}
