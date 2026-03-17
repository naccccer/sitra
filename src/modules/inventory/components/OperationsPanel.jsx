import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const STATUS_MAP = {
  draft: { label: 'پیش نویس', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'ارسال شده', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'تایید شده', cls: 'bg-emerald-100 text-emerald-700' },
  posted: { label: 'ثبت شده', cls: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'لغو شده', cls: 'bg-red-100 text-red-600' },
}

const TYPE_LABELS = {
  receipt: 'رسید',
  delivery: 'حواله',
  transfer: 'انتقال',
  production_move: 'تولید',
  production_consume: 'مصرف تولید',
  production_output: 'خروجی تولید',
  adjustment: 'تعدیل',
  count: 'شمارش',
}

export const OperationsPanel = ({ operationType, session, onNew }) => {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(null)

  const role = session?.user?.role || session?.role
  const isManager = role === 'admin' || role === 'manager'
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await inventoryApi.fetchV2Operations({
        type: operationType,
        status: statusFilter,
        q,
        page,
        pageSize,
      })
      setRows(Array.isArray(response?.operations) ? response.operations : [])
      setTotal(Number(response?.total) || 0)
    } catch {
      setError('خطا در بارگذاری داده ها')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [operationType, page, q, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const handleAction = async (id, action) => {
    if (action === 'cancel' && !window.confirm('آیا از لغو این عملیات مطمئن هستید؟')) {
      return
    }

    setActing(id)
    try {
      await inventoryApi.operationAction({ id, action })
      await load()
    } catch (err) {
      window.alert(err?.message || 'خطا در اجرای عملیات')
    } finally {
      setActing(null)
    }
  }

  const getActions = (operation) => {
    const actions = []
    if (operation.status === 'draft') actions.push({ label: 'ارسال', action: 'submit', variant: 'secondary' })
    if (operation.status === 'submitted' && isManager) actions.push({ label: 'تایید', action: 'approve', variant: 'secondary' })
    if (operation.status === 'approved' && isManager) actions.push({ label: 'ثبت', action: 'post', variant: 'primary' })
    if (!['posted', 'cancelled'].includes(operation.status) && isManager) {
      actions.push({ label: 'لغو', action: 'cancel', variant: 'danger' })
    }
    return actions
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="جستجو در شماره عملیات یا کد مرجع"
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            setPage(1)
          }}
          dir="rtl"
        />
        <select
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
        >
          <option value="">همه وضعیت ها</option>
          {Object.entries(STATUS_MAP).map(([value, status]) => (
            <option key={value} value={value}>{status.label}</option>
          ))}
        </select>
        <Button size="sm" variant="primary" onClick={onNew}>+ عملیات جدید</Button>
        <Button size="sm" variant="ghost" onClick={() => void load()}>بارگذاری مجدد</Button>
      </div>

      {loading && <div className="py-6 text-center text-sm text-slate-400">در حال بارگذاری...</div>}
      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">شماره عملیات</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نوع</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار مبدا</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار مقصد</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">کد مرجع</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">وضعیت</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">تعداد خطوط</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">تاریخ</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اقدامات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-400">رکوردی یافت نشد</td>
                </tr>
              )}
              {rows.map((operation) => {
                const status = STATUS_MAP[operation.status] ?? STATUS_MAP.draft
                const actions = getActions(operation)
                return (
                  <tr key={operation.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2 font-mono text-xs">{operation.operationNo}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{TYPE_LABELS[operation.operationType] ?? operation.operationType}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{operation.sourceWarehouseName || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs">{operation.targetWarehouseName || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{operation.referenceCode || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center text-xs">{operation.lineCount}</td>
                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{operation.createdAt}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {actions.map((actionItem) => (
                          <Button
                            key={actionItem.action}
                            size="xs"
                            variant={actionItem.variant}
                            disabled={acting === operation.id}
                            onClick={() => void handleAction(operation.id, actionItem.action)}
                          >
                            {actionItem.label}
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
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>قبلی</Button>
            <span className="px-2 py-1 text-slate-600">{page} / {totalPages}</span>
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>بعدی</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
