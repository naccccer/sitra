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
import { InventoryEntityDialog } from '@/modules/inventory/components/InventoryEntityDialog'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'
import { toPN } from '@/utils/helpers'

const USAGE_LABELS = {
  internal: 'داخلی',
  supplier: 'تامین‌کننده',
  customer: 'مشتری',
  inventory: 'موجودی',
  production: 'تولید',
}

const EMPTY_FORM = { id: null, warehouseId: '', parentLocationId: '', locationKey: '', name: '', usageType: 'internal', notes: '' }

export const InventoryLocationsArchivePanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_locations.write')

  const [warehouses, setWarehouses] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    inventoryApi.fetchV2Warehouses({ includeArchived: true }).then((response) => {
      setWarehouses(Array.isArray(response?.warehouses) ? response.warehouses : [])
    }).catch(() => setWarehouses([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inventoryApi.fetchV2Locations({
        warehouseId: warehouseFilter || undefined,
        includeArchived: archiveMode,
      })
      setRows(Array.isArray(response?.locations) ? response.locations : [])
    } catch (loadError) {
      setError(loadError?.message || 'بارگذاری مکان‌ها ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [archiveMode, warehouseFilter])

  useEffect(() => {
    void load()
  }, [load])

  const closeModal = () => {
    setModal(null)
    setFormError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError('')
    if (!modal?.warehouseId || !modal?.locationKey?.trim() || !modal?.name?.trim()) {
      setFormError('انبار، کلید مکان و نام اجباری است.')
      return
    }

    setSaving(true)
    try {
      const payload = { ...modal, parentLocationId: modal.parentLocationId || null }
      const response = modal.id
        ? await inventoryApi.updateV2Location(payload)
        : await inventoryApi.createV2Location(payload)
      if (!response?.success) {
        setFormError(response?.error || 'ذخیره مکان ناموفق بود.')
        return
      }
      closeModal()
      await load()
    } catch (saveError) {
      setFormError(saveError?.message || 'ذخیره مکان ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (location) => {
    const confirmed = window.confirm(`مکان ${location?.name || ''} بایگانی شود؟`)
    if (!confirmed) return
    try {
      await inventoryApi.archiveV2Location(location.id)
      await load()
    } catch (archiveError) {
      setError(archiveError?.message || 'بایگانی مکان ناموفق بود.')
    }
  }

  const handleRestore = async (location) => {
    try {
      await inventoryApi.restoreV2Location(location.id)
      await load()
    } catch (restoreError) {
      setError(restoreError?.message || 'بازیابی مکان ناموفق بود.')
    }
  }

  const warehouseName = (id) => warehouses.find((warehouse) => String(warehouse.id) === String(id))?.name ?? id

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWrite && !archiveMode ? <Button action="create" showActionIcon size="sm" onClick={() => { setFormError(''); setModal({ ...EMPTY_FORM, warehouseId: warehouseFilter }) }}>مکان جدید</Button> : null}
        summary={(
          <>
            <Badge tone={archiveMode ? 'neutral' : 'accent'}>{archiveMode ? 'حالت: بایگانی' : 'حالت: فعال'}</Badge>
            <Badge tone="neutral">نتیجه: {toPN(rows.length)}</Badge>
          </>
        )}
      >
        <FilterRow className="gap-3">
          <div className="me-auto flex flex-1 flex-wrap items-center gap-2">
            <Select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} size="sm" className="sm:w-48">
              <option value="">همه انبارها</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
          </div>
          <IconButton
            action="archive"
            variant={archiveMode ? 'primary' : 'secondary'}
            label={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
            tooltip={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
            onClick={() => setArchiveMode((current) => !current)}
          />
          <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={() => void load()} disabled={loading} loading={loading} />
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
            <DataTableState colSpan={canWrite ? 6 : 5} title={archiveMode ? 'مکان بایگانی‌شده‌ای وجود ندارد' : 'مکانی برای نمایش وجود ندارد'} />
          ) : rows.map((location) => (
            <DataTableRow key={location.id} tone={location.isActive === false ? 'muted' : 'default'}>
              <DataTableCell tone="emphasis">{location.name}</DataTableCell>
              <DataTableCell className="font-mono tabular-nums" dir="ltr">{location.locationKey}</DataTableCell>
              <DataTableCell>{warehouseName(location.warehouseId)}</DataTableCell>
              <DataTableCell align="center">{USAGE_LABELS[location.usageType] ?? location.usageType}</DataTableCell>
              <DataTableCell align="center">
                <Badge tone={location.isActive === false ? 'neutral' : 'success'}>
                  {location.isActive === false ? 'بایگانی شده' : 'فعال'}
                </Badge>
              </DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" size="iconSm" surface="table" label="ویرایش مکان" tooltip="ویرایش مکان" onClick={() => { setFormError(''); setModal({ ...location, parentLocationId: location.parentLocationId ?? '' }) }} />
                        <IconButton action="archive" size="iconSm" surface="table" label="بایگانی مکان" tooltip="بایگانی مکان" onClick={() => handleArchive(location)} />
                      </>
                    ) : (
                      <IconButton action="restore" size="iconSm" surface="table" label="بازیابی مکان" tooltip="بازیابی مکان" onClick={() => handleRestore(location)} />
                    )}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <InventoryEntityDialog isOpen title={modal.id ? 'ویرایش مکان' : 'مکان جدید'} onClose={closeModal} onSubmit={handleSave} saving={saving} maxWidthClass="max-w-lg">
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
        </InventoryEntityDialog>
      ) : null}
    </div>
  )
}
