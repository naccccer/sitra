import { useCallback, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const REPORT_TABS = [
  { id: 'on_hand', label: 'موجودی انبار' },
  { id: 'cardex', label: 'کاردکس' },
  { id: 'operations', label: 'جریان عملیات' },
]

const MOVEMENT_LABELS = {
  in: 'ورود',
  out: 'خروج',
  reserve: 'رزرو',
  release: 'آزادسازی',
}

const OnHandReport = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">محصول</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">مکان</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">موجودی فیزیکی</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">رزروشده</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-emerald-700">قابل دسترس</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">موجودی‌ای ثبت نشده است</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50">
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.productName}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.warehouseName}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.locationName}</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono">{r.quantityOnHand}</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono text-amber-600">{r.quantityReserved}</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono font-bold text-emerald-700">{r.quantityAvailable}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const CardexReport = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">تاریخ</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">محصول</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">نوع حرکت</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">تغییر موجودی</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">شماره عملیات</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">حرکت موجودی‌ای ثبت نشده است</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50">
            <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{r.createdAt}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.productName}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.warehouseName}</td>
            <td className="border border-slate-200 px-3 py-2 text-center">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{MOVEMENT_LABELS[r.movementType] ?? r.movementType}</span>
            </td>
            <td className={`border border-slate-200 px-3 py-2 text-center text-xs font-mono font-bold ${Number(r.quantityOnHandDelta) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {Number(r.quantityOnHandDelta) >= 0 ? '+' : ''}{r.quantityOnHandDelta}
            </td>
            <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{r.operationNo ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const OperationsReport = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نوع عملیات</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">وضعیت</th>
          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">تعداد</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اولین</th>
          <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">آخرین</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">عملیاتی یافت نشد</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50">
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.operationType}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs">{r.status}</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-xs font-bold">{r.count}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{r.earliest}</td>
            <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{r.latest}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const InventoryReportsPanel = () => {
  const [activeReport, setActiveReport] = useState('on_hand')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetched, setFetched] = useState(false)

  const runReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFetched(false)
    try {
      const res = await inventoryApi.fetchV2Report(activeReport)
      setRows(Array.isArray(res?.rows) ? res.rows : [])
      setFetched(true)
    } catch {
      setError('خطا در بارگذاری گزارش')
    } finally {
      setLoading(false)
    }
  }, [activeReport])

  const handleTabChange = (id) => {
    setActiveReport(id)
    setRows([])
    setFetched(false)
    setError(null)
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeReport === tab.id ? 'primary' : 'secondary'}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
        <Button size="sm" variant="primary" onClick={runReport} disabled={loading}>
          {loading ? 'در حال بارگذاری...' : 'اجرای گزارش'}
        </Button>
      </div>

      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!fetched && !loading && !error && (
        <div className="py-8 text-center text-sm text-slate-400">برای مشاهده گزارش روی «اجرای گزارش» کلیک کنید.</div>
      )}

      {fetched && activeReport === 'on_hand' && <OnHandReport rows={rows} />}
      {fetched && activeReport === 'cardex' && <CardexReport rows={rows} />}
      {fetched && activeReport === 'operations' && <OperationsReport rows={rows} />}
    </Card>
  )
}
