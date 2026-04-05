import { useEffect, useMemo, useState } from 'react'
import { Button, ModalShell } from '@/components/shared/ui'
import { OperationLineEditor } from '@/modules/inventory/components/OperationLineEditor'
import { getInventoryOperationConfig } from '@/modules/inventory/config/inventoryConfig'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

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

const findProduct = (products, productId) => products.find((product) => String(product.id) === String(productId)) ?? null

export const OperationFormModal = ({ operationType, onClose, onCreated }) => {
  const config = getInventoryOperationConfig(operationType)

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
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

    inventoryApi.fetchV2Locations({ includeInactive: false }).then((response) => {
      setLocations(Array.isArray(response?.locations) ? response.locations : [])
    }).catch(() => setLocations([]))
  }, [])

  const sourceLocations = useMemo(() => (
    locations.filter((location) => String(location.warehouseId) === String(sourceWarehouseId))
  ), [locations, sourceWarehouseId])

  const targetLocations = useMemo(() => (
    locations.filter((location) => String(location.warehouseId) === String(targetWarehouseId))
  ), [locations, targetWarehouseId])

  const setLine = (key, field, value) => {
    setLines((prev) => prev.map((line) => {
      if (line._key !== key) return line
      if (field !== 'productId') return { ...line, [field]: value }

      const nextProduct = findProduct(products, value)
      return {
        ...line,
        productId: value,
        uom: line.uom || nextProduct?.uom || '',
      }
    }))
  }

  const addLine = () => setLines((prev) => [...prev, buildEmptyLine()])

  const removeLine = (key) => {
    setLines((prev) => {
      const next = prev.filter((line) => line._key !== key)
      return next.length > 0 ? next : [buildEmptyLine()]
    })
  }

  const validatePayload = (payloadLines) => {
    if (config.needsSource && !sourceWarehouseId) {
      return 'انتخاب انبار مبدا اجباری است.'
    }
    if (config.needsTarget && !targetWarehouseId) {
      return 'انتخاب انبار مقصد اجباری است.'
    }
    if (payloadLines.length === 0) {
      return 'حداقل یک خط با محصول معتبر لازم است.'
    }
    if (payloadLines.some((line) => Number(line.quantityRequested) <= 0)) {
      return 'مقدار درخواستی باید بیشتر از صفر باشد.'
    }
    if (config.needsSource && payloadLines.some((line) => !line.sourceLocationId)) {
      return 'برای همه خطوط باید مکان مبدا انتخاب شود.'
    }
    if (config.needsTarget && payloadLines.some((line) => !line.targetLocationId)) {
      return 'برای همه خطوط باید مکان مقصد انتخاب شود.'
    }
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const payloadLines = lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        quantityRequested: parseFloat(line.quantityRequested) || 0,
        quantityDone: parseFloat(line.quantityDone || line.quantityRequested) || 0,
        uom: line.uom,
        sourceLocationId: config.needsSource ? (line.sourceLocationId || null) : null,
        targetLocationId: config.needsTarget ? (line.targetLocationId || null) : null,
        notes: line.notes,
      }))

    const validationError = validatePayload(payloadLines)
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      operationType,
      sourceWarehouseId: config.needsSource ? sourceWarehouseId || null : null,
      targetWarehouseId: config.needsTarget ? targetWarehouseId || null : null,
      notes,
      lines: payloadLines,
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
    <ModalShell
      isOpen
      title={`${config.formLabel} جدید`}
      onClose={onClose}
      closeButtonMode="icon"
      maxWidthClass="max-w-5xl"
      overlayClassName="bg-slate-950/55 backdrop-blur-[6px]"
      contentClassName="!rounded-[32px] border border-white/75 bg-[rgb(var(--ui-surface))]"
      headerClassName="rounded-t-[32px] !border-white/10 !bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] [&>div]:!items-center [&_h3]:!text-white [&_button]:!text-white [&_button]:hover:!bg-white/10"
      bodyClassName="space-y-4 bg-[linear-gradient(180deg,rgba(247,247,248,0.88),rgba(243,243,245,0.96))] p-4 sm:p-5 [&_label]:text-[12px] [&_label]:font-black [&_label]:text-slate-600 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-white/90 [&_select]:rounded-xl [&_select]:border-slate-200 [&_select]:bg-white/90"
      footerClassName="rounded-b-[32px] border-white/80 bg-white/90 px-4 py-3"
      footer={(
        <div className="flex items-center justify-start gap-2" dir="ltr">
          <Button type="submit" form="inventory-operation-form" variant="primary" disabled={submitting} className="!rounded-[18px] !bg-emerald-600 !text-white hover:!bg-emerald-700">
            {submitting ? 'در حال ذخیره...' : 'ذخیره پیش نویس'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="!rounded-[18px]">انصراف</Button>
        </div>
      )}
    >
      <form id="inventory-operation-form" onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error ? <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.needsSource ? (
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
          ) : null}

          {config.needsTarget ? (
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
          ) : null}

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
              <OperationLineEditor
                key={line._key}
                line={line}
                index={index}
                products={products}
                config={config}
                sourceLocations={sourceLocations}
                targetLocations={targetLocations}
                setLine={setLine}
                removeLine={removeLine}
              />
            ))}
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
