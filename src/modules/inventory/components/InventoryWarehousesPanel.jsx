import { useCallback, useEffect, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const EMPTY_FORM = { id: null, warehouseKey: '', name: '', notes: '' }

export const InventoryWarehousesPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_warehouses.write')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2Warehouses({ includeInactive })
      setRows(Array.isArray(res?.warehouses) ? res.warehouses : [])
    } catch {
      setError('خطا در بارگذاری انبارها')
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM }) }
  const openEdit = (w) => { setFormError(null); setModal({ id: w.id, warehouseKey: w.warehouseKey, name: w.name, notes: w.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!modal.warehouseKey.trim() || !modal.name.trim()) { setFormError('کلید انبار و نام اجباری است.'); return }
    setSaving(true)
    try {
      const res = modal.id
        ? await inventoryApi.updateV2Warehouse(modal)
        : await inventoryApi.createV2Warehouse(modal)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (w) => {
    try {
      await inventoryApi.setV2WarehouseActive(w.id, !w.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت انبار')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          نمایش غیرفعال
        </label>
        {canWrite && <Button size="sm" variant="primary" onClick={openCreate}>+ انبار جدید</Button>}
        <Button size="sm" variant="ghost" onClick={() => void load()}>بارگذاری مجدد</Button>
      </div>

      {loading && <div className="py-6 text-center text-sm text-slate-400">در حال بارگذاری...</div>}
      {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">نام انبار</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">کلید</th>
                <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">توضیحات</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">وضعیت</th>
                {canWrite && <th className="border border-slate-200 px-3 py-2 text-start font-medium text-slate-600">اقدامات</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={canWrite ? 5 : 4} className="py-8 text-center text-sm text-slate-400">انباری یافت نشد</td></tr>
              )}
              {rows.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 text-xs font-medium">{w.name}</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{w.warehouseKey}</td>
                  <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{w.notes || '-'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${w.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {w.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="xs" variant="secondary" onClick={() => openEdit(w)}>ویرایش</Button>
                        <Button size="xs" variant={w.isActive ? 'danger' : 'secondary'} onClick={() => handleToggleActive(w)}>
                          {w.isActive ? 'غیرفعال' : 'فعال'}
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش انبار' : 'انبار جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">نام انبار <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">کلید یکتا <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" value={modal.warehouseKey} onChange={(e) => setModal((m) => ({ ...m, warehouseKey: e.target.value }))} placeholder="مثال: wh-main" required />
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
