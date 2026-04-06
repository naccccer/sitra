import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { InventoryEntityDialog } from '@/modules/inventory/components/InventoryEntityDialog'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const EMPTY_FORM = { id: null, productId: '', warehouseId: '', minQty: '', maxQty: '', notes: '' }

const RuleForm = ({ modal, setModal, onSave, onClose, saving, formError, products, warehouses }) => (
  <InventoryEntityDialog
    isOpen
    title={modal.id ? 'ویرایش قانون تامین مجدد' : 'قانون تامین مجدد جدید'}
    onClose={onClose}
    onSubmit={onSave}
    saving={saving}
    maxWidthClass="max-w-md"
  >
    {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>}
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">محصول <span className="text-red-500">*</span></label>
      <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productId} onChange={(e) => setModal((m) => ({ ...m, productId: e.target.value }))} required>
        <option value="">انتخاب محصول</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">انبار <span className="text-red-500">*</span></label>
      <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.warehouseId} onChange={(e) => setModal((m) => ({ ...m, warehouseId: e.target.value }))} required>
        <option value="">انتخاب انبار</option>
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">حداقل موجودی <span className="text-red-500">*</span></label>
        <input type="number" min="0" step="0.001" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.minQty} onChange={(e) => setModal((m) => ({ ...m, minQty: e.target.value }))} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">حداکثر موجودی <span className="text-red-500">*</span></label>
        <input type="number" min="0" step="0.001" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.maxQty} onChange={(e) => setModal((m) => ({ ...m, maxQty: e.target.value }))} required />
      </div>
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
      <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))} />
    </div>
  </InventoryEntityDialog>
)

export const InventoryReplenishmentPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_settings.write')

  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [rules, setRules] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    inventoryApi.fetchV2Products({ includeInactive: false }).then((res) => setProducts(Array.isArray(res?.products) ? res.products : [])).catch(() => {})
    inventoryApi.fetchV2Warehouses({ includeInactive: false }).then((res) => setWarehouses(Array.isArray(res?.warehouses) ? res.warehouses : [])).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2ReplenishmentRules()
      setRules(Array.isArray(res?.rules) ? res.rules : [])
    } catch {
      setError('خطا در بارگذاری قوانین تامین مجدد')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM }) }
  const openEdit = (r) => { setFormError(null); setModal({ id: r.id, productId: r.productId, warehouseId: r.warehouseId, minQty: String(r.minQty), maxQty: String(r.maxQty), notes: r.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!modal.productId || !modal.warehouseId) { setFormError('محصول و انبار اجباری است.'); return }
    if (parseFloat(modal.maxQty) < parseFloat(modal.minQty)) { setFormError('حداکثر باید بزرگ‌تر از حداقل باشد.'); return }
    setSaving(true)
    try {
      const payload = { ...modal, minQty: parseFloat(modal.minQty), maxQty: parseFloat(modal.maxQty) }
      const res = modal.id ? await inventoryApi.updateV2ReplenishmentRule(payload) : await inventoryApi.createV2ReplenishmentRule(payload)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این قانون مطمئن هستید؟')) return
    try {
      await inventoryApi.deleteV2ReplenishmentRule(id)
      void load()
    } catch {
      window.alert('خطا در حذف قانون')
    }
  }

  const handleSuggest = async () => {
    setSuggestLoading(true)
    try {
      const res = await inventoryApi.getV2ReplenishmentSuggestions()
      setSuggestions(Array.isArray(res?.suggestions) ? res.suggestions : [])
      setShowSuggestions(true)
    } catch {
      window.alert('خطا در تولید پیشنهادات')
    } finally {
      setSuggestLoading(false)
    }
  }

  const productName = (id) => products.find((p) => String(p.id) === String(id))?.name ?? id
  const warehouseName = (id) => warehouses.find((w) => String(w.id) === String(id))?.name ?? id

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-700">قوانین تامین مجدد (حداقل / حداکثر)</div>
          <div className="text-xs text-slate-500">وقتی موجودی به حداقل برسد، پیشنهاد خرید یا تولید ایجاد می‌شود.</div>
        </div>
        {canWrite && <Button size="sm" action="create" onClick={openCreate}>+ قانون جدید</Button>}
        <Button size="sm" variant="secondary" disabled={suggestLoading} onClick={handleSuggest}>
          {suggestLoading ? 'در حال محاسبه...' : 'نمایش پیشنهادات'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void load()}>بارگذاری مجدد</Button>
      </div>

      {loading && <div className="py-4 text-center text-sm text-slate-400">در حال بارگذاری...</div>}
      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">محصول</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">حداقل</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">حداکثر</th>
                {canWrite && <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اقدامات</th>}
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={canWrite ? 5 : 4} className="py-8 text-center text-sm text-slate-400">قانونی تعریف نشده است</td></tr>
              )}
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 text-xs">{productName(r.productId)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{warehouseName(r.warehouseId)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono">{r.minQty}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono">{r.maxQty}</td>
                  {canWrite && (
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="xs" variant="secondary" onClick={() => openEdit(r)}>ویرایش</Button>
                        <Button size="xs" variant="danger" onClick={() => handleDelete(r.id)}>حذف</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSuggestions && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700">پیشنهادات تامین مجدد</div>
            <Button size="xs" variant="ghost" onClick={() => setShowSuggestions(false)}>بستن</Button>
          </div>
          {suggestions.length === 0
            ? <div className="py-4 text-center text-xs text-slate-400">همه محصولات بالاتر از حداقل موجودی هستند.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-50">
                      <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">محصول</th>
                      <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار</th>
                      <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">موجودی قابل دسترس</th>
                      <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">حداقل</th>
                      <th className="border border-slate-200 px-3 py-2 text-center font-medium text-amber-700">مقدار پیشنهادی سفارش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={s.ruleId} className="hover:bg-amber-50">
                        <td className="border border-slate-200 px-3 py-2 text-xs">{s.productName}</td>
                        <td className="border border-slate-200 px-3 py-2 text-xs">{s.warehouseName}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono text-red-600">{s.availableQty}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono">{s.minQty}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-xs font-mono font-bold text-amber-700">{s.suggestedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {modal && <RuleForm modal={modal} setModal={setModal} onSave={handleSave} onClose={closeModal} saving={saving} formError={formError} products={products} warehouses={warehouses} />}
    </Card>
  )
}
