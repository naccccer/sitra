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
import { toPN } from '@/utils/helpers'
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
            <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.uom} onChange={(event) => setModal((current) => ({ ...current, uom: event.target.value }))} placeholder="مثال: کیلوگرم" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">توضیحات</label>
          <input type="text" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.notes} onChange={(event) => setModal((current) => ({ ...current, notes: event.target.value }))} placeholder="اختیاری" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
          <Button type="submit" action="save" showActionIcon disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
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
      if (typeFilter) products = products.filter((product) => product.productType === typeFilter)
      setRows(products)
    } catch {
      setError('خطا در بارگذاری محصولات')
    } finally {
      setLoading(false)
    }
  }, [q, includeInactive, typeFilter])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM }) }
  const openEdit = (product) => { setFormError(null); setModal({ id: product.id, name: product.name, productCode: product.productCode, productType: product.productType, uom: product.uom, notes: product.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (event) => {
    event.preventDefault()
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
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={openCreate}>محصول جدید</Button> : null}
        summary={(
          <>
            <Badge tone="neutral">محصولات: {toPN(rows.length)}</Badge>
            {typeFilter ? <Badge tone="accent">فیلتر نوع فعال است</Badge> : null}
          </>
        )}
      >
        <FilterRow className="justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-52">
              <Input type="text" value={q} onChange={(event) => setQ(event.target.value)} placeholder="جستجو در نام یا کد" size="sm" />
            </div>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} size="sm" className="sm:w-40">
              <option value="">همه انواع</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <label className="flex items-center gap-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
              <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
              نمایش غیرفعال
            </label>
          </div>
          <IconButton action="reload" label="بارگذاری مجدد" tooltip="بارگذاری مجدد" onClick={() => void load()} disabled={loading} loading={loading} />
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری محصولات">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[860px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>نام محصول</DataTableHeaderCell>
            <DataTableHeaderCell>کد</DataTableHeaderCell>
            <DataTableHeaderCell align="center">نوع</DataTableHeaderCell>
            <DataTableHeaderCell align="center">واحد</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 6 : 5} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={canWrite ? 6 : 5} title="محصولی یافت نشد" />
          ) : rows.map((product) => (
            <DataTableRow key={product.id} tone={product.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis">{product.name}</DataTableCell>
              <DataTableCell className="font-mono tabular-nums" dir="ltr">{product.productCode || '-'}</DataTableCell>
              <DataTableCell align="center">{TYPE_LABELS[product.productType] ?? product.productType}</DataTableCell>
              <DataTableCell align="center">{product.uom}</DataTableCell>
              <DataTableCell align="center"><Badge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'فعال' : 'غیرفعال'}</Badge></DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش محصول" tooltip="ویرایش محصول" onClick={() => openEdit(product)} />
                    <IconButton action={product.isActive ? 'delete' : 'restore'} label={product.isActive ? 'غیرفعال کردن محصول' : 'فعال کردن محصول'} tooltip={product.isActive ? 'غیرفعال کردن محصول' : 'فعال کردن محصول'} onClick={() => handleToggleActive(product)} />
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {modal ? <ProductForm modal={modal} setModal={setModal} onSave={handleSave} onClose={closeModal} saving={saving} formError={formError} /> : null}
    </div>
  )
}
