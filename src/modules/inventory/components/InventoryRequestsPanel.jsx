import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input, Select } from '@/components/shared/ui'

export const InventoryRequestsPanel = ({
  warehouses = [],
  items = [],
  requests = [],
  canCreate = false,
  canApprove = false,
  onCreate,
  onPatch,
}) => {
  const [draft, setDraft] = useState({
    warehouseId: '',
    itemId: '',
    quantityBase: '1',
    quantitySecondary: '0',
    requestNotes: '',
  })
  const [error, setError] = useState('')

  const limitedRequests = useMemo(() => [...requests].slice(0, 50), [requests])

  const handleCreate = async () => {
    if (!canCreate) return
    setError('')
    if (!draft.warehouseId || !draft.itemId) {
      setError('انبار و کالا الزامی است.')
      return
    }

    try {
      await onCreate({
        warehouseId: Number(draft.warehouseId),
        itemId: Number(draft.itemId),
        quantityBase: Number(draft.quantityBase || 0),
        quantitySecondary: Number(draft.quantitySecondary || 0),
        requestNotes: draft.requestNotes,
      })
      setDraft((prev) => ({ ...prev, requestNotes: '' }))
    } catch (e) {
      setError(e?.message || 'ثبت درخواست ناموفق بود.')
    }
  }

  const statusTone = (status) => {
    if (status === 'approved') return 'success'
    if (status === 'pending') return 'warning'
    if (status === 'rejected') return 'danger'
    return 'neutral'
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-800">درخواست خروج انبار</div>

      {canCreate && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={draft.warehouseId} onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))}>
            <option value="">انبار</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>

          <Select value={draft.itemId} onChange={(e) => setDraft((p) => ({ ...p, itemId: e.target.value }))}>
            <option value="">کالا</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>

          <Input value={draft.quantityBase} onChange={(e) => setDraft((p) => ({ ...p, quantityBase: e.target.value }))} placeholder="مقدار پایه" dir="ltr" />
          <Input value={draft.quantitySecondary} onChange={(e) => setDraft((p) => ({ ...p, quantitySecondary: e.target.value }))} placeholder="مقدار دوم" dir="ltr" />

          <Input className="md:col-span-3" value={draft.requestNotes} onChange={(e) => setDraft((p) => ({ ...p, requestNotes: e.target.value }))} placeholder="توضیحات درخواست" />
          <Button onClick={handleCreate}>ثبت درخواست</Button>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}

      <div className="space-y-2">
        {limitedRequests.map((request) => (
          <div key={request.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <div className="text-xs font-black text-slate-800">کالا: {request.itemTitle || request.itemId} | انبار: {request.warehouseName || request.warehouseId}</div>
              <div className="text-[11px] font-bold text-slate-500" dir="ltr">
                base: {request.quantityBase} | secondary: {request.quantitySecondary}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Badge tone={statusTone(request.status)}>{request.status}</Badge>
              {canApprove && request.status === 'pending' && (
                <>
                  <Button size="sm" variant="success" onClick={() => onPatch({ action: 'approve', id: Number(request.id) })}>تایید</Button>
                  <Button size="sm" variant="danger" onClick={() => onPatch({ action: 'reject', id: Number(request.id) })}>رد</Button>
                </>
              )}
              {request.status === 'pending' && (
                <Button size="sm" variant="secondary" onClick={() => onPatch({ action: 'cancel', id: Number(request.id) })}>لغو</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
