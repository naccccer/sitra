import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input, Select } from '@/components/shared/ui'

const DOC_TYPES = [
  { value: 'receipt', label: 'رسید ورود' },
  { value: 'issue', label: 'حواله خروج' },
  { value: 'transfer', label: 'انتقال بین انبار' },
  { value: 'adjustment', label: 'تعدیل' },
]

export const InventoryDocumentsPanel = ({
  warehouses = [],
  items = [],
  documents = [],
  canWrite = false,
  onCreate,
  onPost,
  onCancel,
}) => {
  const [draft, setDraft] = useState({
    docType: 'receipt',
    sourceWarehouseId: '',
    targetWarehouseId: '',
    itemId: '',
    quantityBase: '1',
    quantitySecondary: '0',
    postImmediately: true,
    notes: '',
  })
  const [error, setError] = useState('')

  const limitedDocuments = useMemo(() => [...documents].slice(0, 40), [documents])

  const handleCreate = async () => {
    if (!canWrite) return
    setError('')

    if (!draft.itemId) {
      setError('کالا را انتخاب کنید.')
      return
    }

    try {
      await onCreate({
        docType: draft.docType,
        sourceWarehouseId: draft.sourceWarehouseId || null,
        targetWarehouseId: draft.targetWarehouseId || null,
        notes: draft.notes,
        postImmediately: Boolean(draft.postImmediately),
        lines: [{
          itemId: Number(draft.itemId),
          quantityBase: Number(draft.quantityBase || 0),
          quantitySecondary: Number(draft.quantitySecondary || 0),
        }],
      })
    } catch (e) {
      setError(e?.message || 'ثبت سند ناموفق بود.')
    }
  }

  const statusTone = (status) => {
    if (status === 'posted') return 'success'
    if (status === 'draft') return 'warning'
    if (status === 'cancelled') return 'neutral'
    return 'neutral'
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-800">اسناد انبار (ورود/خروج/انتقال/تعدیل)</div>

      {canWrite && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Select value={draft.docType} onChange={(e) => setDraft((p) => ({ ...p, docType: e.target.value }))}>
            {DOC_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>

          <Select value={draft.sourceWarehouseId} onChange={(e) => setDraft((p) => ({ ...p, sourceWarehouseId: e.target.value }))}>
            <option value="">انبار مبدا (در صورت نیاز)</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>

          <Select value={draft.targetWarehouseId} onChange={(e) => setDraft((p) => ({ ...p, targetWarehouseId: e.target.value }))}>
            <option value="">انبار مقصد (در صورت نیاز)</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>

          <Select value={draft.itemId} onChange={(e) => setDraft((p) => ({ ...p, itemId: e.target.value }))}>
            <option value="">کالا</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>

          <Input value={draft.quantityBase} onChange={(e) => setDraft((p) => ({ ...p, quantityBase: e.target.value }))} placeholder="مقدار پایه" dir="ltr" />
          <Input value={draft.quantitySecondary} onChange={(e) => setDraft((p) => ({ ...p, quantitySecondary: e.target.value }))} placeholder="مقدار دوم" dir="ltr" />

          <Input value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="توضیحات" className="md:col-span-2" />
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={draft.postImmediately} onChange={(e) => setDraft((p) => ({ ...p, postImmediately: e.target.checked }))} />
            پست فوری
          </label>

          <div className="md:col-span-3">
            <Button onClick={handleCreate}>ثبت سند</Button>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}

      <div className="space-y-2">
        {limitedDocuments.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <div className="text-xs font-black text-slate-800">{document.docNo} | {document.docType}</div>
              <div className="text-[11px] font-bold text-slate-500">
                خطوط: {Array.isArray(document.lines) ? document.lines.length : 0} | مرجع: {document.referenceType || '-'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge tone={statusTone(document.status)}>{document.status}</Badge>
              {canWrite && document.status === 'draft' && (
                <>
                  <Button size="sm" variant="success" onClick={() => onPost(Number(document.id))}>پست</Button>
                  <Button size="sm" variant="danger" onClick={() => onCancel(Number(document.id))}>لغو</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
