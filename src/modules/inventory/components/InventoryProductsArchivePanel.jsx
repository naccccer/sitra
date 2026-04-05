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
  Input,
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { InventoryEntityDialog } from '@/modules/inventory/components/InventoryEntityDialog'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'
import { toPN } from '@/utils/helpers'

const TYPE_LABELS = {
  stockable: 'انبارشونده',
  consumable: 'مصرفی',
  service: 'خدماتی',
}

const UOM_OPTIONS = [
  'عدد',
  'کیلوگرم',
  'گرم',
  'تن',
  'لیتر',
  'میلی‌لیتر',
  'متر',
  'سانتی‌متر',
  'مترمربع',
  'مترمکعب',
  'بسته',
  'کارتن',
  'جفت',
]

const EMPTY_FORM = { id: null, name: '', productCode: '', productType: 'stockable', uom: '', notes: '' }

export const InventoryProductsArchivePanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_products.write')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inventoryApi.fetchV2Products({
        q: query || undefined,
        includeArchived: archiveMode,
      })
      let products = Array.isArray(response?.products) ? response.products : []
      if (typeFilter) {
        products = products.filter((product) => product.productType === typeFilter)
      }
      setRows(products)
    } catch (loadError) {
      setError(loadError?.message || 'بارگذاری محصولات ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [archiveMode, query, typeFilter])

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
    if (!modal?.name?.trim() || !modal?.uom?.trim()) {
      setFormError('نام و واحد اندازه‌گیری اجباری است.')
      return
    }

    setSaving(true)
    try {
      const response = modal.id
        ? await inventoryApi.updateV2Product(modal)
        : await inventoryApi.createV2Product(modal)
      if (!response?.success) {
        setFormError(response?.error || 'ذخیره محصول ناموفق بود.')
        return
      }
      closeModal()
      await load()
    } catch (saveError) {
      setFormError(saveError?.message || 'ذخیره محصول ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (product) => {
    const confirmed = window.confirm(`محصول ${product?.name || ''} بایگانی شود؟`)
    if (!confirmed) return
    try {
      await inventoryApi.archiveV2Product(product.id)
      await load()
    } catch (archiveError) {
      setError(archiveError?.message || 'بایگانی محصول ناموفق بود.')
    }
  }

  const handleRestore = async (product) => {
    try {
      await inventoryApi.restoreV2Product(product.id)
      await load()
    } catch (restoreError) {
      setError(restoreError?.message || 'بازیابی محصول ناموفق بود.')
    }
  }

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
        <FilterRow className="justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} size="sm" className="w-full sm:w-40">
              <option value="">همه انواع</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2" dir="ltr">
            {canWrite && !archiveMode ? <Button action="create" showActionIcon size="sm" onClick={() => { setFormError(''); setModal({ ...EMPTY_FORM }) }}>محصول جدید</Button> : null}
            <div className="w-full sm:w-52">
              <Input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو..." size="sm" dir="rtl" />
            </div>
            <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={() => void load()} disabled={loading} loading={loading} />
            <IconButton
              action="archive"
              variant={archiveMode ? 'primary' : 'secondary'}
              label={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
              tooltip={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
              onClick={() => setArchiveMode((current) => !current)}
            />
          </div>
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری محصولات">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[860px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>نام محصول</DataTableHeaderCell>
            <DataTableHeaderCell align="center">کد محصول</DataTableHeaderCell>
            <DataTableHeaderCell align="center">نوع</DataTableHeaderCell>
            <DataTableHeaderCell align="center">واحد</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 5 : 4} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState
              colSpan={canWrite ? 5 : 4}
              title={archiveMode ? 'محصول بایگانی‌شده‌ای وجود ندارد' : 'محصولی برای نمایش وجود ندارد'}
            />
          ) : rows.map((product) => (
            <DataTableRow key={product.id} tone={product.isActive === false ? 'muted' : 'default'}>
              <DataTableCell tone="emphasis">{product.name}</DataTableCell>
              <DataTableCell align="center" className="font-mono tabular-nums" dir="ltr">{product.productCode || '-'}</DataTableCell>
              <DataTableCell align="center">{TYPE_LABELS[product.productType] ?? product.productType}</DataTableCell>
              <DataTableCell align="center">{product.uom}</DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" size="iconSm" surface="table" label="ویرایش محصول" tooltip="ویرایش محصول" onClick={() => { setFormError(''); setModal({ ...product }) }} />
                        <IconButton action="archive" size="iconSm" surface="table" label="بایگانی محصول" tooltip="بایگانی محصول" onClick={() => handleArchive(product)} />
                      </>
                    ) : (
                      <IconButton action="restore" size="iconSm" surface="table" label="بازیابی محصول" tooltip="بازیابی محصول" onClick={() => handleRestore(product)} />
                    )}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? (
        <InventoryEntityDialog isOpen title={modal.id ? 'ویرایش محصول' : 'محصول جدید'} onClose={closeModal} onSubmit={handleSave} saving={saving}>
          {formError ? <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div> : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">نام <span className="text-red-500">*</span></label>
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.name} onChange={(event) => setModal((current) => ({ ...current, name: event.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">کد محصول</label>
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productCode} onChange={(event) => setModal((current) => ({ ...current, productCode: event.target.value }))} placeholder="اختیاری" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">نوع محصول <span className="text-red-500">*</span></label>
              <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productType} onChange={(event) => setModal((current) => ({ ...current, productType: event.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">واحد اندازه‌گیری <span className="text-red-500">*</span></label>
              <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.uom} onChange={(event) => setModal((current) => ({ ...current, uom: event.target.value }))} required>
                <option value="" disabled>انتخاب واحد</option>
                {UOM_OPTIONS.map((uom) => <option key={uom} value={uom}>{uom}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(event) => setModal((current) => ({ ...current, notes: event.target.value }))} placeholder="اختیاری" />
          </div>
        </InventoryEntityDialog>
      ) : null}
    </div>
  )
}
