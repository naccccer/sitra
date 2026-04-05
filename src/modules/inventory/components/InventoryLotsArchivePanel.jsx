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

const EMPTY_FORM = { id: null, productId: '', lotCode: '', expiryDate: '', notes: '' }

const formatExpiryDate = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  return toPN(raw.replaceAll('-', '/'))
}

export const InventoryLotsArchivePanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_lots.write')

  const [products, setProducts] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    inventoryApi.fetchV2Products({ includeArchived: true }).then((response) => {
      setProducts(Array.isArray(response?.products) ? response.products : [])
    }).catch(() => setProducts([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inventoryApi.fetchV2Lots({
        productId: productFilter || undefined,
        includeArchived: archiveMode,
      })
      setRows(Array.isArray(response?.lots) ? response.lots : [])
    } catch (loadError) {
      setError(loadError?.message || 'بارگذاری سری‌ها ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [archiveMode, productFilter])

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
    if (!modal?.productId || !modal?.lotCode?.trim()) {
      setFormError('محصول و کد سری اجباری است.')
      return
    }

    setSaving(true)
    try {
      const payload = { ...modal, expiryDate: modal.expiryDate || null }
      const response = modal.id
        ? await inventoryApi.updateV2Lot(payload)
        : await inventoryApi.createV2Lot(payload)
      if (!response?.success) {
        setFormError(response?.error || 'ذخیره سری ناموفق بود.')
        return
      }
      closeModal()
      await load()
    } catch (saveError) {
      setFormError(saveError?.message || 'ذخیره سری ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (lot) => {
    const confirmed = window.confirm(`سری ${lot?.lotCode || ''} بایگانی شود؟`)
    if (!confirmed) return
    try {
      await inventoryApi.archiveV2Lot(lot.id)
      await load()
    } catch (archiveError) {
      setError(archiveError?.message || 'بایگانی سری ناموفق بود.')
    }
  }

  const handleRestore = async (lot) => {
    try {
      await inventoryApi.restoreV2Lot(lot.id)
      await load()
    } catch (restoreError) {
      setError(restoreError?.message || 'بازیابی سری ناموفق بود.')
    }
  }

  const productName = (id) => products.find((product) => String(product.id) === String(id))?.name ?? id

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        summary={(
          <>
            <Badge tone={archiveMode ? 'neutral' : 'accent'}>{archiveMode ? 'حالت: بایگانی' : 'حالت: فعال'}</Badge>
            <Badge tone="neutral">نتیجه: {toPN(rows.length)}</Badge>
          </>
        )}
      >
        <FilterRow className="gap-3">
          <div className="me-auto flex flex-1 flex-wrap items-center gap-2">
            <Select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} size="sm" className="sm:w-48">
              <option value="">همه محصولات</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
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
          {canWrite && !archiveMode ? <Button action="create" showActionIcon size="sm" onClick={() => { setFormError(''); setModal({ ...EMPTY_FORM, productId: productFilter }) }}>سری جدید</Button> : null}
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری سری‌ها">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[760px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell align="center">کد سری</DataTableHeaderCell>
            <DataTableHeaderCell>محصول</DataTableHeaderCell>
            <DataTableHeaderCell align="center">تاریخ انقضا</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 4 : 3} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={canWrite ? 4 : 3} title={archiveMode ? 'سری بایگانی‌شده‌ای وجود ندارد' : 'سری‌ای برای نمایش وجود ندارد'} />
          ) : rows.map((lot) => (
            <DataTableRow key={lot.id} tone={lot.isActive === false ? 'muted' : 'default'}>
              <DataTableCell tone="emphasis" align="center" className="font-mono tabular-nums" dir="ltr">{lot.lotCode}</DataTableCell>
              <DataTableCell>{productName(lot.productId)}</DataTableCell>
              <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatExpiryDate(lot.expiryDate)}</DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" size="iconSm" surface="table" label="ویرایش سری" tooltip="ویرایش سری" onClick={() => { setFormError(''); setModal({ ...lot, expiryDate: lot.expiryDate ?? '' }) }} />
                        <IconButton action="archive" size="iconSm" surface="table" label="بایگانی سری" tooltip="بایگانی سری" onClick={() => handleArchive(lot)} />
                      </>
                    ) : (
                      <IconButton action="restore" size="iconSm" surface="table" label="بازیابی سری" tooltip="بازیابی سری" onClick={() => handleRestore(lot)} />
                    )}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <InventoryEntityDialog isOpen title={modal.id ? 'ویرایش سری' : 'سری جدید'} onClose={closeModal} onSubmit={handleSave} saving={saving}>
          {formError ? <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div> : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">محصول <span className="text-red-500">*</span></label>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productId} onChange={(event) => setModal((current) => ({ ...current, productId: event.target.value }))} required>
              <option value="">انتخاب محصول</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">کد سری <span className="text-red-500">*</span></label>
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" value={modal.lotCode} onChange={(event) => setModal((current) => ({ ...current, lotCode: event.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">تاریخ انقضا</label>
            <input type="date" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.expiryDate} onChange={(event) => setModal((current) => ({ ...current, expiryDate: event.target.value }))} />
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
