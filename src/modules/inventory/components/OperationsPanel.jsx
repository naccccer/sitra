import { useState, useEffect, useCallback } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const STATUS_MAP = {
  draft:     { label: 'پیش‌نویس',    cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'ارسال شده',   cls: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'تأیید شده',   cls: 'bg-emerald-100 text-emerald-700' },
  posted:    { label: 'ثبت شده',     cls: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'لغو شده',     cls: 'bg-red-100 text-red-600' },
}

const TYPE_LABELS = {
  receipt:         'رسید',
  delivery:        'حواله',
  transfer:        'انتقال',
  production_move: 'تولید',
  adjustment:      'تعدیل',
  count:           'شمارش',
}

export const OperationsPanel = ({ operationType, session, onNew }) => {
  const [rows, setRows]               = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ]                     = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [acting, setActing]           = useState(null)

  const PAGE_SIZE = 20
  const role = session?.user?.role
  const isManager = role === 'admin' || role === 'manager'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2Operations({
        type: operationType,
        status: statusFilter,
        q,
        page,
        pageSize: PAGE_SIZE,
      })
      setRows(Array.isArray(res?.operations) ? res.operations : [])
      setTotal(Number(res?.total) || 0)
    } catch {
      setError('خطا در بارگذاری داده‌ها')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [operationType, statusFilter, q, page])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    const confirmLabels = { cancel: 'آیا مطمئن هستید؟ این عملیات لغو خواهد شد.' }
    if (confirmLabels[action] && !window.confirm(confirmLabels[action])) return
    setActing(id)
    try {
      await inventoryApi.operationAction({ id, action })
      load()
    } catch (err) {
      window.alert(err?.message || 'خطا در انجام عملیات')
    } finally {
      setActing(null)
    }
  }

  const getActions = (op) => {
    const acts = []
    if (op.status === 'draft') acts.push({ label: 'ارسال', action: 'submit', variant: 'secondary' })
    if (op.status === 'submitted' && isManager) acts.push({ label: 'تأیید', action: 'approve', variant: 'secondary' })
    if (op.status === 'approved' && isManager) acts.push({ label: 'ثبت', action: 'post', variant: 'primary' })
    if (!['posted', 'cancelled'].includes(op.status) && isManager) acts.push({ label: 'لغو', action: 'cancel', variant: 'danger' })
    return acts
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="جستجو در شماره / کد مرجع..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          dir="rtl"
        />
        <select
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_MAP).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <Button size="sm" variant="primary" onClick={onNew}>+ جدید</Button>
        <Button size="sm" variant="ghost" onClick={load}>↺ بارگذاری</Button>
      </div>

      {loading && (
        <div className="py-6 text-center text-sm text-slate-400">در حال بارگذاری...</div>
      )}
      {error && (
        <div className="py-4 text-center text-sm text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">شماره عملیات</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نوع</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار مبدأ</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار مقصد</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">وضعیت</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">خطوط</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">تاریخ</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    رکوردی یافت نشد
                  </td>
                </tr>
              )}
              {rows.map((op) => {
                const st = STATUS_MAP[op.status] ?? STATUS_MAP.draft
                const acts = getActions(op)
                return (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2 font-mono text-xs">{op.operationNo}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{TYPE_LABELS[op.operationType] ?? op.operationType}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{op.sourceWarehouseName || '—'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{op.targetWarehouseName || '—'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center text-xs">{op.lineCount}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{op.createdAt}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {acts.map((a) => (
                          <Button
                            key={a.action}
                            size="xs"
                            variant={a.variant}
                            disabled={acting === op.id}
                            onClick={() => handleAction(op.id, a.action)}
                          >
                            {a.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} رکورد</span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              قبلی
            </Button>
            <span className="px-2 py-1 text-slate-600">
              {page} / {totalPages}
            </span>
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              بعدی
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
