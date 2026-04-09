import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  ConfirmDialog,
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
import { InventoryEntityDialog } from '@/modules/inventory/components/InventoryEntityDialog'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const EMPTY_FORM = { id: null, warehouseKey: '', name: '', notes: '' }

export const InventoryWarehousesArchivePanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_warehouses.write')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [archiveCandidate, setArchiveCandidate] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inventoryApi.fetchV2Warehouses({ includeArchived: archiveMode })
      setRows(Array.isArray(response?.warehouses) ? response.warehouses : [])
    } catch (loadError) {
      setError(loadError?.message || 'بارگذاری انبارها ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [archiveMode])

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
    if (!modal?.warehouseKey?.trim() || !modal?.name?.trim()) {
      setFormError('کلید انبار و نام اجباری است.')
      return
    }

    setSaving(true)
    try {
      const response = modal.id
        ? await inventoryApi.updateV2Warehouse(modal)
        : await inventoryApi.createV2Warehouse(modal)
      if (!response?.success) {
        setFormError(response?.error || 'ذخیره انبار ناموفق بود.')
        return
      }
      closeModal()
      await load()
    } catch (saveError) {
      setFormError(saveError?.message || 'ذخیره انبار ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (warehouse) => {
    try {
      await inventoryApi.archiveV2Warehouse(warehouse.id)
      setArchiveCandidate(null)
      await load()
    } catch (archiveError) {
      setError(archiveError?.message || 'بایگانی انبار ناموفق بود.')
    }
  }

  const handleRestore = async (warehouse) => {
    try {
      await inventoryApi.restoreV2Warehouse(warehouse.id)
      await load()
    } catch (restoreError) {
      setError(restoreError?.message || 'بازیابی انبار ناموفق بود.')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری انبارها">{error}</InlineAlert> : null}

      <DataTable
        minWidthClass="min-w-[760px]"
        toolbar={(
          <WorkspaceToolbar
            embedded
            actions={canWrite && !archiveMode ? <Button action="create" showActionIcon size="sm" onClick={() => { setFormError(''); setModal({ ...EMPTY_FORM }) }}>انبار جدید</Button> : null}
          >
            <FilterRow className="justify-end gap-2">
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
        )}
      >
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
            <DataTableState colSpan={canWrite ? 5 : 4} title={archiveMode ? 'انبار بایگانی‌شده‌ای وجود ندارد' : 'انباری برای نمایش وجود ندارد'} />
          ) : rows.map((warehouse) => (
            <DataTableRow key={warehouse.id} tone={warehouse.isActive === false ? 'muted' : 'default'}>
              <DataTableCell tone="emphasis">{warehouse.name}</DataTableCell>
              <DataTableCell className="font-mono tabular-nums" dir="ltr">{warehouse.warehouseKey}</DataTableCell>
              <DataTableCell>{warehouse.notes || '-'}</DataTableCell>
              <DataTableCell align="center">
                <Badge tone={warehouse.isActive === false ? 'neutral' : 'success'}>
                  {warehouse.isActive === false ? 'بایگانی شده' : 'فعال'}
                </Badge>
              </DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" size="iconSm" surface="table" label="ویرایش انبار" tooltip="ویرایش انبار" onClick={() => { setFormError(''); setModal({ ...warehouse }) }} />
                        <IconButton action="archive" size="iconSm" surface="table" label="بایگانی انبار" tooltip="بایگانی انبار" onClick={() => setArchiveCandidate(warehouse)} />
                      </>
                    ) : (
                      <IconButton action="restore" size="iconSm" surface="table" label="بازیابی انبار" tooltip="بازیابی انبار" onClick={() => handleRestore(warehouse)} />
                    )}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <InventoryEntityDialog isOpen title={modal.id ? 'ویرایش انبار' : 'انبار جدید'} onClose={closeModal} onSubmit={handleSave} saving={saving}>
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
        </InventoryEntityDialog>
      ) : null}
      <ConfirmDialog
        isOpen={Boolean(archiveCandidate)}
        title="بایگانی انبار"
        description={`انبار ${archiveCandidate?.name || ''} بایگانی شود؟`}
        confirmLabel="بایگانی انبار"
        onCancel={() => setArchiveCandidate(null)}
        onConfirm={() => archiveCandidate ? handleArchive(archiveCandidate) : undefined}
      />
    </div>
  )
}
