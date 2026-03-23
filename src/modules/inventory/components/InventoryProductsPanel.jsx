import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const TYPE_LABELS = {
  stockable: 'انبارشونده',
  consumable: 'مصرفی',
  service: 'خدماتی',
}

const EMPTY_FORM = { id: null, name: '', productCode: '', productType: 'stockable', uom: '', notes: '' }

const ProductForm = ({ modal, setModal, onSave, onClose, saving, formError }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" dir="rtl">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش محصول' : 'محصول جدید'}</h2>
      <form onSubmit={onSave} className="space-y-3">
        {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">نام <span className="text-red-500">*</span></label>
          <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">کد محصول</label>
          <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productCode} onChange={(e) => setModal((m) => ({ ...m, productCode: e.target.value }))} placeholder="اختیاری" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">نوع محصول <span className="text-red-500">*</span></label>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productType} onChange={(e) => setModal((m) => ({ ...m, productType: e.target.value }))}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">واحد اندازه‌گیری <span className="text-red-500">*</span></label>
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.uom} onChange={(e) => setModal((m) => ({ ...m, uom: e.target.value }))} placeholder="مثال: کیلوگرم" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
          <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))} placeholder="اختیاری" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
        </div>
      </form>
    </div>
  </div>
)

export const InventoryProductsPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_products.write')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2Products({ q, includeInactive })
      let products = Array.isArray(res?.products) ? res.products : []
      if (typeFilter) products = products.filter((p) => p.productType === typeFilter)
      setRows(products)
    } catch {
      setError('خطا در بارگذاری محصولات')
    } finally {
      setLoading(false)
    }
  }, [q, includeInactive, typeFilter])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM }) }
  const openEdit = (p) => { setFormError(null); setModal({ id: p.id, name: p.name, productCode: p.productCode, productType: p.productType, uom: p.uom, notes: p.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!modal.name.trim() || !modal.uom.trim()) { setFormError('نام و واحد اندازه‌گیری اجباری است.'); return }
    setSaving(true)
    try {
      const res = modal.id ? await inventoryApi.updateV2Product(modal) : await inventoryApi.createV2Product(modal)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (product) => {
    try {
      await inventoryApi.setV2ProductActive(product.id, !product.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت محصول')
    }
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="جستجو در نام یا کد"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          dir="rtl"
        />
        <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">همه انواع</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          نمایش غیرفعال
        </label>
        {canWrite && <Button size="sm" variant="primary" onClick={openCreate}>+ محصول جدید</Button>}
        <Button size="sm" variant="ghost" onClick={() => void load()}>بارگذاری مجدد</Button>
      </div>

      {loading && <div className="py-6 text-center text-sm text-slate-400">در حال بارگذاری...</div>}
      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نام محصول</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">کد</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نوع</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">واحد</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">وضعیت</th>
                {canWrite && <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اقدامات</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-sm text-slate-400">محصولی یافت نشد</td></tr>
              )}
              {rows.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 text-xs font-medium">{product.name}</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{product.productCode || '-'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{TYPE_LABELS[product.productType] ?? product.productType}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{product.uom}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {product.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="xs" variant="secondary" onClick={() => openEdit(product)}>ویرایش</Button>
                        <Button size="xs" variant={product.isActive ? 'danger' : 'secondary'} onClick={() => handleToggleActive(product)}>
                          {product.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <ProductForm modal={modal} setModal={setModal} onSave={handleSave} onClose={closeModal} saving={saving} formError={formError} />
      )}
    </Card>
  )
}
