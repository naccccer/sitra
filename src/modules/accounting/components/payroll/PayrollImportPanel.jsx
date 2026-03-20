import { useMemo, useState } from 'react'
import { Button, Card, Input } from '@/components/shared/ui'
import { parsePayrollImportFile } from './payrollImportXlsx'

export function PayrollImportPanel({ busy, employees, run, onApply }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasBlockingErrors = useMemo(() => preview?.summary?.errors > 0, [preview])

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      setPreview(await parsePayrollImportFile(file, employees))
    } catch (parseError) {
      setPreview(null)
      setError(parseError.message)
    } finally {
      setLoading(false)
    }
  }

  const applyImport = async () => {
    if (!run?.id || !preview) return
    await onApply({
      periodId: run.id,
      periodKey: run.periodKey,
      rows: preview.rows.filter((row) => row.errors.length === 0).map((row) => ({
        employeeId: row.employee.id,
        inputs: Object.fromEntries(Object.entries(row.values).filter(([key]) => key !== 'notes')),
        notes: row.values.notes || '',
      })),
    })
    setPreview(null)
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-slate-900">ورود اکسل ماهانه</div>
          <div className="text-xs font-bold text-slate-500">فقط فیلدهای متغیر ماهانه مانند اضافه کار، پاداش و کسورات اعمال می شوند.</div>
        </div>
        <Input
          type="file"
          accept=".xlsx,.xls"
          className="h-10 max-w-72 cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
          onChange={(event) => handleFile(event.target.files?.[0] || null)}
        />
      </div>

      {!run?.id && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">برای اعمال فایل، ابتدا یک دوره حقوق را انتخاب کنید.</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">در حال خواندن فایل اکسل...</div>}

      {preview && (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <Summary label="تعداد ردیف" value={preview.summary.total} />
            <Summary label="قابل اعمال" value={preview.summary.valid} />
            <Summary label="هشدار" value={preview.summary.warnings} />
            <Summary label="خطا" value={preview.summary.errors} />
          </div>
          {preview.unknownHeaders.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">ستون های نادیده گرفته شده: {preview.unknownHeaders.join('، ')}</div>}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="px-3 py-2">ردیف</th>
                  <th className="px-3 py-2">پرسنل</th>
                  <th className="px-3 py-2">فیلدها</th>
                  <th className="px-3 py-2">اعتبارسنجی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {preview.rows.map((row) => (
                  <tr key={`${row.rowNumber}:${row.employee?.id || row.identifier.employeeCode || row.identifier.nationalId || 'row'}`}>
                    <td className="px-3 py-2 font-black text-slate-900">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <div className="font-black text-slate-900">{row.employee?.fullName || row.employee?.name || '-'}</div>
                      <div className="text-[11px] font-bold text-slate-500">{row.identifier.employeeCode || row.identifier.nationalId || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{Object.keys(row.values).join('، ') || '-'}</td>
                    <td className="px-3 py-2">
                      {row.errors.map((message) => <div key={message} className="text-[11px] font-bold text-rose-700">{message}</div>)}
                      {row.warnings.map((message) => <div key={message} className="text-[11px] font-bold text-amber-700">{message}</div>)}
                      {row.errors.length === 0 && row.warnings.length === 0 && <div className="text-[11px] font-bold text-emerald-700">آماده اعمال</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>پاک کردن پیش نمایش</Button>
            <Button size="sm" variant="primary" disabled={!run?.id || busy || hasBlockingErrors} onClick={applyImport}>
              {busy ? 'در حال اعمال...' : 'اعمال به دوره انتخابی'}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

function Summary({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-slate-900">{value}</div></div>
}
