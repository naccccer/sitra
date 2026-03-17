import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const USAGE_LABELS = {
  internal: 'داخلی',
  supplier: 'تامین‌کننده',
  customer: 'مشتری',
  inventory: 'موجودی',
  production: 'تولید',
}

const EMPTY_FORM = { id: null, warehouseId: '', parentLocationId: '', locationKey: '', name: '', usageType: 'internal', notes: '' }

export const InventoryLocationsPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_locations.write')

  const [warehouses, setWarehouses] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    inventoryApi.fetchV2Warehouses({ includeInactive: true }).then((res) => {
      setWarehouses(Array.isArray(res?.warehouses) ? res.warehouses : [])
    }).catch(() => setWarehouses([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2Locations({
        warehouseId: warehouseFilter || undefined,
        includeInactive,
      })
      setRows(Array.isArray(res?.locations) ? res.locations : [])
    } catch {
      setError('خطا در بارگذاری مکان‌ها')
    } finally {
      setLoading(false)
    }
  }, [warehouseFilter, includeInactive])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM, warehouseId: warehouseFilter }) }
  const openEdit = (loc) => {
    setFormError(null)
    setModal({ id: loc.id, warehouseId: loc.warehouseId, parentLocationId: loc.parentLocationId ?? '', locationKey: loc.locationKey, name: loc.name, usageType: loc.usageType, notes: loc.notes })
  }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!modal.warehouseId || !modal.locationKey.trim() || !modal.name.trim()) {
      setFormError('انبار، کلید مکان و نام اجباری است.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...modal, parentLocationId: modal.parentLocationId || null }
      const res = modal.id ? await inventoryApi.updateV2Location(payload) : await inventoryApi.createV2Location(payload)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (loc) => {
    try {
      await inventoryApi.setV2LocationActive(loc.id, !loc.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت مکان')
    }
  }

  const warehouseName = (id) => warehouses.find((w) => String(w.id) === String(id))?.name ?? id

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="">همه انبارها</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          نمایش غیرفعال
        </label>
        {canWrite && <Button size="sm" variant="primary" onClick={openCreate}>+ مکان جدید</Button>}
        <Button size="sm" variant="ghost" onClick={() => void load()}>بارگذاری مجدد</Button>
      </div>

      {loading && <div className="py-6 text-center text-sm text-slate-400">در حال بارگذاری...</div>}
      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نام مکان</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">کلید</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">انبار</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نوع کاربری</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">وضعیت</th>
                {canWrite && <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اقدامات</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-sm text-slate-400">مکانی یافت نشد</td></tr>
              )}
              {rows.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 text-xs font-medium">{loc.name}</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{loc.locationKey}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{warehouseName(loc.warehouseId)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs">{USAGE_LABELS[loc.usageType] ?? loc.usageType}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${loc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {loc.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="xs" variant="secondary" onClick={() => openEdit(loc)}>ویرایش</Button>
                        <Button size="xs" variant={loc.isActive ? 'danger' : 'secondary'} onClick={() => handleToggleActive(loc)}>
                          {loc.isActive ? 'غیرفعال' : 'فعال'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" dir="rtl">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش مکان' : 'مکان جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">انبار <span className="text-red-500">*</span></label>
                <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.warehouseId} onChange={(e) => setModal((m) => ({ ...m, warehouseId: e.target.value }))} required>
                  <option value="">انتخاب انبار</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">کلید مکان <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" value={modal.locationKey} onChange={(e) => setModal((m) => ({ ...m, locationKey: e.target.value }))} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">نوع کاربری</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.usageType} onChange={(e) => setModal((m) => ({ ...m, usageType: e.target.value }))}>
                    {Object.entries(USAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">نام مکان <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>انصراف</Button>
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
