import { useMemo } from 'react'
import { Button, Card, Select } from '@/components/shared/ui'

const REPORT_OPTIONS = [
  { value: 'stock', label: 'موجودی لحظه ای' },
  { value: 'ledger', label: 'کاردکس کالا' },
  { value: 'documents', label: 'گردش اسناد' },
  { value: 'count_variance', label: 'مغایرت انبارگردانی' },
  { value: 'requests', label: 'وضعیت درخواست ها' },
]

export const InventoryReportsPanel = ({ reportType, setReportType, rows = [], onRun }) => {
  const columns = useMemo(() => {
    if (!rows.length || typeof rows[0] !== 'object') return []
    return Object.keys(rows[0]).slice(0, 8)
  }, [rows])

  return (
    <Card padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-800">گزارش های انبار</div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={reportType} onChange={(e) => setReportType(e.target.value)} className="max-w-xs">
          {REPORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        <Button onClick={onRun}>به روزرسانی گزارش</Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-500">
          داده ای برای گزارش انتخابی وجود ندارد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="p-2 text-start font-black">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.slice(0, 100).map((row, index) => (
                <tr key={String(row?.id || row?.documentId || index)}>
                  {columns.map((column) => (
                    <td key={`${index}-${column}`} className="whitespace-nowrap p-2 font-bold text-slate-700">
                      {String(row?.[column] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
