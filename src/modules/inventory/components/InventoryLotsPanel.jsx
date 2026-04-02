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

const EMPTY_FORM = { id: null, productId: '', lotCode: '', expiryDate: '', notes: '' }
const formatExpiryDate = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  return toPN(raw.replaceAll('-', '/'))
}

export const InventoryLotsPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_lots.write')

  const [products, setProducts] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [productFilter, setProductFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    inventoryApi.fetchV2Products({ includeInactive: true }).then((res) => {
      setProducts(Array.isArray(res?.products) ? res.products : [])
    }).catch(() => setProducts([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.fetchV2Lots({ productId: productFilter || undefined, includeInactive })
      setRows(Array.isArray(res?.lots) ? res.lots : [])
    } catch {
      setError('خطا در بارگذاری لات‌ها')
    } finally {
      setLoading(false)
    }
  }, [productFilter, includeInactive])

  useEffect(() => { void load() }, [load])

  const openCreate = () => { setFormError(null); setModal({ ...EMPTY_FORM, productId: productFilter }) }
  const openEdit = (lot) => { setFormError(null); setModal({ id: lot.id, productId: lot.productId, lotCode: lot.lotCode, expiryDate: lot.expiryDate ?? '', notes: lot.notes }) }
  const closeModal = () => { setModal(null); setFormError(null) }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (!modal.productId || !modal.lotCode.trim()) { setFormError('محصول و کد لات اجباری است.'); return }
    setSaving(true)
    try {
      const payload = { ...modal, expiryDate: modal.expiryDate || null }
      const res = modal.id ? await inventoryApi.updateV2Lot(payload) : await inventoryApi.createV2Lot(payload)
      if (!res?.success) { setFormError(res?.error || 'خطا در ذخیره‌سازی'); return }
      closeModal()
      void load()
    } catch (err) {
      setFormError(err?.message || 'خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (lot) => {
    try {
      await inventoryApi.setV2LotActive(lot.id, !lot.isActive)
      void load()
    } catch {
      window.alert('خطا در تغییر وضعیت لات')
    }
  }

  const productName = (id) => products.find((product) => String(product.id) === String(id))?.name ?? id

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={openCreate}>لات جدید</Button> : null}
        summary={<Badge tone="neutral">لات‌ها: {toPN(rows.length)}</Badge>}
      >
        <FilterRow className="justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} size="sm" className="sm:w-48">
              <option value="">همه محصولات</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </Select>
            <label className="flex items-center gap-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
              <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
              نمایش غیرفعال
            </label>
          </div>
          <IconButton action="reload" label="بارگذاری مجدد" tooltip="بارگذاری مجدد" onClick={() => void load()} disabled={loading} loading={loading} />
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری لات‌ها">{error}</InlineAlert> : null}

      <DataTable minWidthClass="min-w-[760px]">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>کد لات</DataTableHeaderCell>
            <DataTableHeaderCell>محصول</DataTableHeaderCell>
            <DataTableHeaderCell align="center">تاریخ انقضا</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 5 : 4} state="loading" title="در حال بارگذاری..." />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={canWrite ? 5 : 4} title="لاتی یافت نشد" />
          ) : rows.map((lot) => (
            <DataTableRow key={lot.id} tone={lot.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis" className="font-mono tabular-nums" dir="ltr">{lot.lotCode}</DataTableCell>
              <DataTableCell>{productName(lot.productId)}</DataTableCell>
              <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatExpiryDate(lot.expiryDate)}</DataTableCell>
              <DataTableCell align="center"><Badge tone={lot.isActive ? 'success' : 'neutral'}>{lot.isActive ? 'فعال' : 'غیرفعال'}</Badge></DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش لات" tooltip="ویرایش لات" onClick={() => openEdit(lot)} />
                    <IconButton action={lot.isActive ? 'delete' : 'restore'} label={lot.isActive ? 'غیرفعال کردن لات' : 'فعال کردن لات'} tooltip={lot.isActive ? 'غیرفعال کردن لات' : 'فعال کردن لات'} onClick={() => handleToggleActive(lot)} />
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
            <h2 className="mb-4 text-base font-bold text-slate-800">{modal.id ? 'ویرایش لات' : 'لات جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {formError ? <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div> : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">محصول <span className="text-red-500">*</span></label>
                <select className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={modal.productId} onChange={(event) => setModal((current) => ({ ...current, productId: event.target.value }))} required>
                  <option value="">انتخاب محصول</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">کد لات <span className="text-red-500">*</span></label>
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
