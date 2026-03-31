import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  InlineAlert,
  WorkspaceToolbar,
} from '@/components/shared/ui'
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
  const openEdit = (warehouse) => { setFormError(null); setModal({ id: warehouse.id, warehouseKey: warehouse.warehouseKey, name: warehouse.name, notes: warehouse.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (!modal.warehouseKey.trim() || !modal.name.trim()) { setFormError('کلید انبار و نام اجباری است.'); return }
    setSaving(true)
    try {
      const res = modal.id ? await inventoryApi.updateV2Warehouse(modal) : await inventoryApi.createV2Warehouse(modal)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (warehouse) => {
    try {
      await inventoryApi.setV2WarehouseActive(warehouse.id, !warehouse.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت انبار')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={openCreate}>انبار جدید</Button> : null}
        summary={<Badge tone="neutral">انبارها: {rows.length}</Badge>}
      >
        <FilterRow className="justify-between gap-3">
          <label className="flex items-center gap-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
            <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
            نمایش غیرفعال
          </label>
          <IconButton action="reload" label="بارگذاری مجدد" tooltip="بارگذاری مجدد" onClick={() => void load()} disabled={loading} loading={loading} />
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری انبارها">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[760px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>نام انبار</DataTableHeaderCell>
            <DataTableHeaderCell>کلید</DataTableHeaderCell>
            <DataTableHeaderCell>توضیحات</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 5 : 4} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={canWrite ? 5 : 4} title="انباری یافت نشد" />
          ) : rows.map((warehouse) => (
            <DataTableRow key={warehouse.id} tone={warehouse.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis">{warehouse.name}</DataTableCell>
              <DataTableCell className="font-mono">{warehouse.warehouseKey}</DataTableCell>
              <DataTableCell>{warehouse.notes || '-'}</DataTableCell>
              <DataTableCell align="center"><Badge tone={warehouse.isActive ? 'success' : 'neutral'}>{warehouse.isActive ? 'فعال' : 'غیرفعال'}</Badge></DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش انبار" tooltip="ویرایش انبار" onClick={() => openEdit(warehouse)} />
                    <IconButton action={warehouse.isActive ? 'delete' : 'restore'} label={warehouse.isActive ? 'غیرفعال کردن انبار' : 'فعال کردن انبار'} tooltip={warehouse.isActive ? 'غیرفعال کردن انبار' : 'فعال کردن انبار'} onClick={() => handleToggleActive(warehouse)} />
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" dir="rtl">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش انبار' : 'انبار جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError ? <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div> : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">نام انبار <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(event) => setModal((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">کلید یکتا <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" value={modal.warehouseKey} onChange={(event) => setModal((current) => ({ ...current, warehouseKey: event.target.value }))} placeholder="مثال: wh-main" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(event) => setModal((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>انصراف</Button>
                <Button type="submit" action="save" showActionIcon disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
