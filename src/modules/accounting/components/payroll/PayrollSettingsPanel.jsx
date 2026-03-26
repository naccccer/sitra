import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select } from '@/components/shared/ui'
import { normalizeCatalogItem } from './payrollCatalog'
import { PayrollScrollableTableCard } from './PayrollScrollableTableCard'
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
    <PayrollSurfaceCard density="spacious" className="space-y-4">
      <PayrollSectionHeader title="تنظیمات فیش حقوقی" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Input value={safeDraft.companyName || ''} onChange={(event) => patch('companyName', event.target.value)} placeholder="نام شرکت" />
        <Input value={safeDraft.companyId || ''} onChange={(event) => patch('companyId', event.target.value)} placeholder="شناسه / کد کارگاهی" />
      </div>

      <PayrollSurfaceCard className="space-y-2" tone="muted">
        <PayrollSectionHeader title="تنظیمات امضا" subtitle="نمایش در چاپ فیش" />
        <div className="grid gap-2">
          <Input value={safeDraft.signatureLabel || ''} onChange={(event) => patch('signatureLabel', event.target.value)} placeholder="عنوان بلوک امضا" />
          <Input value={safeDraft.signatoryName || ''} onChange={(event) => patch('signatoryName', event.target.value)} placeholder="نام امضاکننده" />
          <Input value={safeDraft.signatoryTitle || ''} onChange={(event) => patch('signatoryTitle', event.target.value)} placeholder="سمت امضاکننده" />
          <Input value={safeDraft.signatureNote || ''} onChange={(event) => patch('signatureNote', event.target.value)} placeholder="یادداشت امضا" />
        </div>
      </PayrollSurfaceCard>

      <PayrollSurfaceCard className="space-y-2" tone="muted">
        <PayrollSectionHeader
          title="کاتالوگ آیتم‌های فیش"
          action={<Button size="sm" variant="ghost" disabled={!canManage} onClick={addItem}>آیتم جدید</Button>}
        />

        <PayrollScrollableTableCard>
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-2 py-2">عنوان</th>
                <th className="px-2 py-2">نوع</th>
                <th className="px-2 py-2">فعال</th>
                <th className="px-2 py-2">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={`${item.key}:${index}`}>
                  <td className="px-2 py-2">
                    <Input value={item.label} onChange={(event) => patchItem(index, { label: event.target.value })} placeholder="عنوان آیتم" />
                  </td>
                  <td className="px-2 py-2">
                    <Select value={item.type} onChange={(event) => patchItem(index, { type: event.target.value })}>
                      <option value="earning">دریافتی</option>
                      <option value="deduction">کسورات</option>
                      <option value="work">کارکرد</option>
                      <option value="info">اطلاعات</option>
                    </Select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={item.active !== false} onChange={(event) => patchItem(index, { active: event.target.checked })} />
                  </td>
                  <td className="px-2 py-2">
                    <Button size="sm" variant="danger" disabled={!canManage} onClick={() => removeItem(index)}>حذف</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center font-bold text-slate-400">آیتمی ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </PayrollScrollableTableCard>
      </PayrollSurfaceCard>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="primary"
          disabled={!canManage || busy}
          onClick={() => onSave({ ...safeDraft, payrollItemCatalog: items.map((item, index) => ({ ...item, sortOrder: index + 1 })) })}
        >
          {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </PayrollSurfaceCard>
  )
}
