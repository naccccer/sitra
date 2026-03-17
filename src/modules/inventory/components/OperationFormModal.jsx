import { useEffect, useState } from 'react'
import { Button } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const TYPE_CONFIG = {
  receipt: { needsTarget: true, needsSource: false, label: 'رسید انبار' },
  delivery: { needsTarget: false, needsSource: true, label: 'حواله انبار' },
  transfer: { needsTarget: true, needsSource: true, label: 'انتقال انبار' },
  adjustment: { needsTarget: true, needsSource: false, label: 'تعدیل موجودی' },
  production_consume: { needsTarget: false, needsSource: true, label: 'مصرف تولید' },
  production_output: { needsTarget: true, needsSource: false, label: 'خروجی تولید' },
}

const buildEmptyLine = () => ({
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
  const config = TYPE_CONFIG[operationType] ?? TYPE_CONFIG.receipt

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [targetWarehouseId, setTargetWarehouseId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([buildEmptyLine()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    inventoryApi.fetchV2Warehouses({ includeInactive: false }).then((response) => {
      setWarehouses(Array.isArray(response?.warehouses) ? response.warehouses : [])
    }).catch(() => setWarehouses([]))

    inventoryApi.fetchV2Products({ includeInactive: false }).then((response) => {
      setProducts(Array.isArray(response?.products) ? response.products : [])
    }).catch(() => setProducts([]))
  }, [])

  const setLine = (key, field, value) => {
    setLines((prev) => prev.map((line) => (line._key === key ? { ...line, [field]: value } : line)))
  }

  const addLine = () => setLines((prev) => [...prev, buildEmptyLine()])

  const removeLine = (key) => {
    setLines((prev) => {
      const next = prev.filter((line) => line._key !== key)
      return next.length > 0 ? next : [buildEmptyLine()]
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const payload = {
      operationType,
      sourceWarehouseId: config.needsSource ? sourceWarehouseId || null : null,
      targetWarehouseId: config.needsTarget ? targetWarehouseId || null : null,
      notes,
      lines: lines
        .filter((line) => line.productId)
        .map((line) => ({
          productId: line.productId,
          quantityRequested: parseFloat(line.quantityRequested) || 0,
          quantityDone: parseFloat(line.quantityDone || line.quantityRequested) || 0,
          uom: line.uom,
          sourceLocationId: line.sourceLocationId || null,
          targetLocationId: line.targetLocationId || null,
          notes: line.notes,
        })),
    }

    if (payload.lines.length === 0) {
      setError('حداقل یک خط با محصول معتبر لازم است.')
      return
    }

    setSubmitting(true)
    try {
      const response = await inventoryApi.createV2Operation(payload)
      if (!response?.success) {
        setError(response?.error || 'خطا در ذخیره سازی')
        return
      }
      onCreated(response.operation)
    } catch (err) {
      setError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" dir="rtl">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{config.label} - جدید</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="بستن">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {error && <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {config.needsSource && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">انبار مبدا</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={sourceWarehouseId}
                    onChange={(event) => setSourceWarehouseId(event.target.value)}
                    required
                  >
                    <option value="">انتخاب انبار</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {config.needsTarget && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">انبار مقصد</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={targetWarehouseId}
                    onChange={(event) => setTargetWarehouseId(event.target.value)}
                    required
                  >
                    <option value="">انتخاب انبار</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={config.needsSource && config.needsTarget ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
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
                {lines.map((line, index) => (
                  <div key={line._key} className="grid grid-cols-12 gap-2 rounded border border-slate-200 p-2">
                    <div className="col-span-4">
                      <label className="mb-0.5 block text-xs text-slate-500">محصول</label>
                      <select
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.productId}
                        onChange={(event) => setLine(line._key, 'productId', event.target.value)}
                        required
                      >
                        <option value="">انتخاب</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-slate-500">مقدار درخواستی</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.quantityRequested}
                        onChange={(event) => setLine(line._key, 'quantityRequested', event.target.value)}
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
                        onChange={(event) => setLine(line._key, 'quantityDone', event.target.value)}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-slate-500">واحد</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        value={line.uom}
                        onChange={(event) => setLine(line._key, 'uom', event.target.value)}
                        placeholder="مثال: کیلوگرم"
                      />
                    </div>

                    <div className="col-span-2 flex items-end justify-end">
                      {index > 0 && (
                        <Button type="button" size="xs" variant="danger" onClick={() => removeLine(line._key)}>حذف</Button>
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
              {submitting ? 'در حال ذخیره...' : 'ذخیره پیش نویس'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
