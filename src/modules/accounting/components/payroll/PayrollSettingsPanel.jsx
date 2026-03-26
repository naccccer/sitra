import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/shared/ui'
import { normalizeCatalogItem } from './payrollCatalog'
import { PayrollSectionHeader } from './PayrollSectionHeader'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'

function createNewCatalogItem() {
  const nonce = Date.now()
  return {
    key: `custom_${nonce}`,
    label: 'آیتم سفارشی',
    type: 'earning',
    source: `custom_${nonce}`,
    sortOrder: 999,
    active: true,
  }
}

export function PayrollSettingsPanel({ busy, canManage, onSave, settings }) {
  const [draft, setDraft] = useState(settings)
  const safeDraft = draft || {}

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const items = useMemo(
    () => (Array.isArray(safeDraft.payrollItemCatalog) ? safeDraft.payrollItemCatalog : []).map((item, index) => normalizeCatalogItem(item, index)),
    [safeDraft.payrollItemCatalog],
  )

  const patch = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const patchItem = (itemKey, nextLabel) => patch('payrollItemCatalog', items.map((item) => (item.key === itemKey ? { ...item, label: nextLabel } : item)))

  const removeItem = (itemKey) => patch('payrollItemCatalog', items.filter((item) => item.key !== itemKey))

  const addItem = (type) => {
    patch('payrollItemCatalog', [...items, { ...createNewCatalogItem(), type }])
  }

  const grouped = useMemo(() => ({
    workInfo: items.filter((item) => item.type === 'work' || item.type === 'info'),
    earning: items.filter((item) => item.type === 'earning'),
    deduction: items.filter((item) => item.type === 'deduction'),
  }), [items])

  return (
    <PayrollSurfaceCard density="spacious" className="space-y-4">
      <PayrollSectionHeader title="تنظیمات فیش حقوقی" />

      <PayrollSurfaceCard className="space-y-2" tone="muted">
        <PayrollSectionHeader title="تنظیمات فیش حقوقی" subtitle="سربرگ و اطلاعات امضا در یک ردیف" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Input value={safeDraft.companyName || ''} onChange={(event) => patch('companyName', event.target.value)} placeholder="نام شرکت" />
          <Input value={safeDraft.companyId || ''} onChange={(event) => patch('companyId', event.target.value)} placeholder="شناسه / کد کارگاهی" />
          <Input value={safeDraft.signatoryName || ''} onChange={(event) => patch('signatoryName', event.target.value)} placeholder="نام امضاکننده" />
          <Input value={safeDraft.signatoryTitle || ''} onChange={(event) => patch('signatoryTitle', event.target.value)} placeholder="سمت امضاکننده" />
        </div>
      </PayrollSurfaceCard>

      <CatalogGroup
        items={grouped.workInfo}
        canManage={canManage}
        onAdd={() => addItem('work')}
        onPatch={patchItem}
        onRemove={removeItem}
        title="کارکرد و اطلاعات"
      />
      <CatalogGroup
        items={grouped.earning}
        canManage={canManage}
        onAdd={() => addItem('earning')}
        onPatch={patchItem}
        onRemove={removeItem}
        title="دریافتی‌ها"
      />
      <CatalogGroup
        items={grouped.deduction}
        canManage={canManage}
        onAdd={() => addItem('deduction')}
        onPatch={patchItem}
        onRemove={removeItem}
        title="کسورات"
      />

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="primary"
          disabled={!canManage || busy}
          onClick={() => onSave({
            ...safeDraft,
            signatureLabel: 'امضا و تایید',
            signatureNote: '',
            payrollItemCatalog: items.map((item, index) => ({ ...item, active: true, sortOrder: index + 1 })),
          })}
        >
          {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </PayrollSurfaceCard>
  )
}

function CatalogGroup({ canManage, items = [], onAdd, onPatch, onRemove, title }) {
  return (
    <PayrollSurfaceCard className="space-y-2" tone="muted">
      <PayrollSectionHeader title={title} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
            <Input value={item.label} onChange={(event) => onPatch(item.key, event.target.value)} placeholder="عنوان فیلد" />
            <Button
              size="icon"
              variant="ghost"
              disabled={!canManage}
              onClick={() => onRemove(item.key)}
              title="حذف فیلد"
              aria-label="حذف فیلد"
              className="h-8 w-8 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <button
          type="button"
          disabled={!canManage}
          onClick={onAdd}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن فیلد
        </button>
        {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs font-bold text-slate-400">فیلدی ثبت نشده است.</div>}
      </div>
    </PayrollSurfaceCard>
  )
}
