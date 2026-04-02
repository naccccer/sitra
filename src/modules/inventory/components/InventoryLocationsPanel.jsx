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
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
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
      const res = await inventoryApi.fetchV2Locations({ warehouseId: warehouseFilter || undefined, includeInactive })
      setRows(Array.isArray(res?.locations) ? res.locations : [])
    } catch {
      setError('خطا در بارگذاری مکان‌ها')
    } finally {
      setLoading(false)
    }
  }, [warehouseFilter, includeInactive])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM, warehouseId: warehouseFilter }) }
  const openEdit = (location) => {
    setFormError(null)
    setModal({ id: location.id, warehouseId: location.warehouseId, parentLocationId: location.parentLocationId ?? '', locationKey: location.locationKey, name: location.name, usageType: location.usageType, notes: location.notes })
  }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (!modal.warehouseId || !modal.locationKey.trim() || !modal.name.trim()) { setFormError('انبار، کلید مکان و نام اجباری است.'); return }
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

  const handleToggleActive = async (location) => {
    try {
      await inventoryApi.setV2LocationActive(location.id, !location.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت مکان')
    }
  }

  const warehouseName = (id) => warehouses.find((warehouse) => String(warehouse.id) === String(id))?.name ?? id

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={openCreate}>مکان جدید</Button> : null}
        summary={<Badge tone="neutral">مکان‌ها: {toPN(rows.length)}</Badge>}
      >
        <FilterRow className="justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} size="sm" className="sm:w-48">
              <option value="">همه انبارها</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
            <label className="flex items-center gap-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
              <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
              نمایش غیرفعال
            </label>
          </div>
          <IconButton action="reload" label="بارگذاری مجدد" tooltip="بارگذاری مجدد" onClick={() => void load()} disabled={loading} loading={loading} />
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری مکان‌ها">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[960px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>نام مکان</DataTableHeaderCell>
            <DataTableHeaderCell>کلید</DataTableHeaderCell>
            <DataTableHeaderCell>انبار</DataTableHeaderCell>
            <DataTableHeaderCell align="center">نوع کاربری</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 6 : 5} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={canWrite ? 6 : 5} title="مکانی یافت نشد" />
          ) : rows.map((location) => (
            <DataTableRow key={location.id} tone={location.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis">{location.name}</DataTableCell>
              <DataTableCell className="font-mono tabular-nums" dir="ltr">{location.locationKey}</DataTableCell>
              <DataTableCell>{warehouseName(location.warehouseId)}</DataTableCell>
              <DataTableCell align="center">{USAGE_LABELS[location.usageType] ?? location.usageType}</DataTableCell>
              <DataTableCell align="center"><Badge tone={location.isActive ? 'success' : 'neutral'}>{location.isActive ? 'فعال' : 'غیرفعال'}</Badge></DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش مکان" tooltip="ویرایش مکان" onClick={() => openEdit(location)} />
                    <IconButton action={location.isActive ? 'delete' : 'restore'} label={location.isActive ? 'غیرفعال کردن مکان' : 'فعال کردن مکان'} tooltip={location.isActive ? 'غیرفعال کردن مکان' : 'فعال کردن مکان'} onClick={() => handleToggleActive(location)} />
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" dir="rtl">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش مکان' : 'مکان جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError ? <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div> : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">انبار <span className="text-red-500">*</span></label>
                <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.warehouseId} onChange={(event) => setModal((current) => ({ ...current, warehouseId: event.target.value }))} required>
                  <option value="">انتخاب انبار</option>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">کلید مکان <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" value={modal.locationKey} onChange={(event) => setModal((current) => ({ ...current, locationKey: event.target.value }))} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">نوع کاربری</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.usageType} onChange={(event) => setModal((current) => ({ ...current, usageType: event.target.value }))}>
                    {Object.entries(USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">نام مکان <span className="text-red-500">*</span></label>
                <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(event) => setModal((current) => ({ ...current, name: event.target.value }))} required />
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
