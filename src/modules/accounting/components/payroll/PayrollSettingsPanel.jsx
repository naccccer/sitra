import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select } from '@/components/shared/ui'
import { normalizeCatalogItem } from './payrollCatalog'

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

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const items = useMemo(
    () => (Array.isArray(draft?.payrollItemCatalog) ? draft.payrollItemCatalog : []).map((item, index) => normalizeCatalogItem(item, index)),
    [draft?.payrollItemCatalog],
  )

  const patch = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const patchItem = (index, next) => {
    patch('payrollItemCatalog', items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)))
  }

  const removeItem = (index) => {
    patch('payrollItemCatalog', items.filter((_, itemIndex) => itemIndex !== index))
  }

  const addItem = () => {
    patch('payrollItemCatalog', [...items, createNewCatalogItem()])
  }

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <div className="text-sm font-black text-slate-900">تنظیمات فیش حقوقی</div>
        <div className="text-xs font-bold text-slate-500">سربرگ چاپ + کاتالوگ آیتم‌های قابل مدیریت مدیر</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Input value={draft.companyName || ''} onChange={(event) => patch('companyName', event.target.value)} placeholder="نام شرکت" />
        <Input value={draft.companyId || ''} onChange={(event) => patch('companyId', event.target.value)} placeholder="شناسه / کد کارگاهی" />
        <Input value={draft.signatureLabel || ''} onChange={(event) => patch('signatureLabel', event.target.value)} placeholder="عنوان بلوک امضا" />
        <Input value={draft.signatoryName || ''} onChange={(event) => patch('signatoryName', event.target.value)} placeholder="نام امضاکننده" />
        <Input value={draft.signatoryTitle || ''} onChange={(event) => patch('signatoryTitle', event.target.value)} placeholder="سمت امضاکننده" />
        <Input value={draft.signatureNote || ''} onChange={(event) => patch('signatureNote', event.target.value)} placeholder="یادداشت امضا" />
      </div>

      <label className="block space-y-1">
        <span className="block text-xs font-black text-slate-600">یادداشت پایین فیش</span>
        <textarea
          value={draft.footerNote || ''}
          onChange={(event) => patch('footerNote', event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
        />
      </label>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">کاتالوگ آیتم‌های فیش</div>
            <div className="text-xs font-bold text-slate-500">نوع، ترتیب، فعال/غیرفعال و منبع هر آیتم را مدیریت کنید.</div>
          </div>
          <Button size="sm" variant="ghost" disabled={!canManage} onClick={addItem}>آیتم جدید</Button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.key}:${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]">
              <Input value={item.label} onChange={(event) => patchItem(index, { label: event.target.value })} placeholder="عنوان آیتم" />
              <Input value={item.key} onChange={(event) => patchItem(index, { key: event.target.value, source: item.source || event.target.value })} placeholder="کلید" />
              <Select value={item.type} onChange={(event) => patchItem(index, { type: event.target.value })}>
                <option value="earning">دریافتی</option>
                <option value="deduction">کسورات</option>
                <option value="work">کارکرد</option>
                <option value="info">اطلاعات</option>
              </Select>
              <Input value={item.source || ''} onChange={(event) => patchItem(index, { source: event.target.value })} placeholder="source" />
              <label className="flex items-center gap-2 px-2 text-xs font-black text-slate-600">
                <input type="checkbox" checked={item.active !== false} onChange={(event) => patchItem(index, { active: event.target.checked })} />
                فعال
              </label>
              <Button size="sm" variant="danger" disabled={!canManage} onClick={() => removeItem(index)}>حذف</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="primary" disabled={!canManage || busy} onClick={() => onSave({ ...draft, payrollItemCatalog: items })}>
          {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </Card>
  )
}

