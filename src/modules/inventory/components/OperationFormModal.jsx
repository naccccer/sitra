import { useState, useEffect } from 'react'
import { Button } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const TYPE_CONFIG = {
  receipt:            { needsTarget: true,  needsSource: false, label: 'رسید انبار' },
  delivery:           { needsTarget: false, needsSource: true,  label: 'حواله انبار' },
  transfer:           { needsTarget: true,  needsSource: true,  label: 'انتقال انبار' },
  adjustment:         { needsTarget: true,  needsSource: false, label: 'تعدیل موجودی' },
  production_consume: { needsTarget: false, needsSource: true,  label: 'مصرف تولید' },
  production_output:  { needsTarget: true,  needsSource: false, label: 'خروجی تولید' },
}

const EMPTY_LINE = () => ({
  _key: Date.now() + Math.random(),
  productId: '',
  quantityRequested: '',
  quantityDone: '',
  uom: '',
  sourceLocationId: '',
  targetLocationId: '',
  notes: '',
})

export const OperationFormModal = ({ operationType, onClose, onCreated }) => {
  const cfg = TYPE_CONFIG[operationType] ?? TYPE_CONFIG.receipt

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts]     = useState([])
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [targetWarehouseId, setTargetWarehouseId] = useState('')
  const [notes, setNotes]           = useState('')
  const [lines, setLines]           = useState([EMPTY_LINE()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  useEffect(() => {
    inventoryApi.fetchV2Warehouses({ includeInactive: false }).then((r) => {
      setWarehouses(Array.isArray(r?.warehouses) ? r.warehouses : [])
    }).catch(() => setWarehouses([]))

    inventoryApi.fetchV2Products({ includeInactive: false }).then((r) => {
      setProducts(Array.isArray(r?.products) ? r.products : [])
    }).catch(() => setProducts([]))
  }, [])

  const setLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l))
    )
  }

  const addLine = () => setLines((prev) => [...prev, EMPTY_LINE()])

  const removeLine = (key) => {
    setLines((prev) => {
      const next = prev.filter((l) => l._key !== key)
      return next.length > 0 ? next : [EMPTY_LINE()]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const payload = {
      operationType,
      sourceWarehouseId: cfg.needsSource ? sourceWarehouseId || null : null,
      targetWarehouseId: cfg.needsTarget ? targetWarehouseId || null : null,
      notes,
      lines: lines
        .filter((l) => l.productId)
        .map((l) => ({
          productId:         l.productId,
          quantityRequested: parseFloat(l.quantityRequested) || 0,
          quantityDone:      parseFloat(l.quantityDone || l.quantityRequested) || 0,
          uom:               l.uom,
          sourceLocationId:  l.sourceLocationId || null,
          targetLocationId:  l.targetLocationId || null,
          notes:             l.notes,
        })),
    }

    if (payload.lines.length === 0) {
      setError('حداقل یک خط با محصول معتبر لازم است.')
      return
    }

    setSubmitting(true)
    try {
      const res = await inventoryApi.createV2Operation(payload)
      if (!res?.success) {
        setError(res?.error || 'خطا در ذخیره‌سازی')
        return
      }
      onCreated(res.operation)
    } catch (err) {
      setError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{cfg.label} — جدید</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cfg.needsSource && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">انبار مبدأ</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">انتخاب انبار...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {cfg.needsTarget && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">انبار مقصد</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">انتخاب انبار...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={cfg.needsSource && cfg.needsTarget ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">خطوط عملیات</span>
                <Button type="button" size="xs" variant="secondary" onClick={addLine}>+ خط جدید</Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={line._key} className="grid grid-cols-12 gap-2 rounded border border-slate-200 p-2">
                    <div className="col-span-4">
                      <label className="mb-0.5 block text-xs text-slate-500">محصول</label>
                      <select
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.productId}
                        onChange={(e) => setLine(line._key, 'productId', e.target.value)}
                        required
                      >
                        <option value="">انتخاب...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-slate-500">مقدار درخواست</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.quantityRequested}
                        onChange={(e) => setLine(line._key, 'quantityRequested', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-slate-500">مقدار انجام شده</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.quantityDone}
                        placeholder={line.quantityRequested}
                        onChange={(e) => setLine(line._key, 'quantityDone', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-slate-500">واحد</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.uom}
                        onChange={(e) => setLine(line._key, 'uom', e.target.value)}
                        placeholder="مثال: کیلوگرم"
                      />
                    </div>
                    <div className="col-span-2 flex items-end justify-end">
                      {idx > 0 && (
                        <Button type="button" size="xs" variant="danger" onClick={() => removeLine(line._key)}>
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
