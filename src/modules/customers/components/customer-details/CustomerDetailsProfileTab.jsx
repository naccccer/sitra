import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input, Select } from '@/components/shared/ui'
import { CUSTOMER_TYPE_OPTIONS } from '../../utils/customersView'

const BASE_FIELDS = [
  { key: 'customerCode', label: 'کد مشتری' },
  { key: 'customerType', label: 'نوع', type: 'select' },
  { key: 'fullName', label: 'نام' },
  { key: 'companyName', label: 'نام شرکت' },
  { key: 'defaultPhone', label: 'تلفن پیش‌فرض', inputMode: 'tel' },
  { key: 'address', label: 'آدرس' },
]

const OPTIONAL_FIELDS = [
  { key: 'notes', label: 'یادداشت' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
]

export const CustomerDetailsProfileTab = ({
  customer = {},
  editDraft = {},
  setEditDraft = () => {},
  canWriteCustomers = false,
  onSaveProfile = () => {},
  isSavingProfile = false,
}) => {
  const [editingField, setEditingField] = useState('')
  const [visibleOptional, setVisibleOptional] = useState([])
  const [editingLabelField, setEditingLabelField] = useState('')
  const [customLabels, setCustomLabels] = useState({})

  const fields = useMemo(
    () => [...BASE_FIELDS, ...OPTIONAL_FIELDS.filter((field) => visibleOptional.includes(field.key))],
    [visibleOptional],
  )

  const addField = () => {
    const next = OPTIONAL_FIELDS.find((field) => !visibleOptional.includes(field.key))
    if (!next) return
    setVisibleOptional((prev) => [...prev, next.key])
    setEditingField(next.key)
  }

  const setField = (key, value) => setEditDraft((prev) => ({ ...prev, [key]: value }))
  const setCustomLabel = (key, value) => setCustomLabels((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="mt-4">
      <Card tone="muted" className="space-y-2" padding="md">
        <div className="flex items-center justify-between">
          <div className="text-sm font-black text-slate-900">خلاصه مشتری</div>
          {canWriteCustomers ? <Button variant="secondary" size="sm" onClick={addField}>+ افزودن فیلد</Button> : null}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-3">
            <div className="text-[11px] font-bold text-slate-500">وضعیت</div>
            <Badge tone={customer.isActive ? 'success' : 'danger'}>{customer.isActive ? 'فعال' : 'غیرفعال'}</Badge>
          </div>
          <div className="rounded-xl bg-white p-3">
            <div className="text-[11px] font-bold text-slate-500">تاریخ بروزرسانی</div>
            <div className="text-xs font-black text-slate-800">{customer.updatedAt || '-'}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <div className="min-w-24">
                {editingLabelField === field.key && canWriteCustomers ? (
                  <Input value={customLabels[field.key] ?? field.label} onChange={(event) => setCustomLabel(field.key, event.target.value)} />
                ) : (
                  <span className="text-[11px] font-bold text-slate-500">{customLabels[field.key] || field.label}</span>
                )}
              </div>
              <div className="flex-1">
                {editingField === field.key && canWriteCustomers ? (
                  field.type === 'select' ? (
                    <Select value={editDraft[field.key] || 'individual'} onChange={(event) => setField(field.key, event.target.value)}>
                      {CUSTOMER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  ) : (
                    <Input value={editDraft[field.key] || ''} onChange={(event) => setField(field.key, event.target.value)} inputMode={field.inputMode} />
                  )
                ) : (
                  <div className="text-xs font-black text-slate-800">{editDraft[field.key] || '-'}</div>
                )}
              </div>
              {canWriteCustomers ? (
                <div className="flex items-center gap-2">
                  {OPTIONAL_FIELDS.some((item) => item.key === field.key) ? (
                    <button type="button" className="text-xs font-black text-slate-400 hover:text-slate-700" onClick={() => setEditingLabelField((prev) => (prev === field.key ? '' : field.key))}>
                      🏷️
                    </button>
                  ) : null}
                  <button type="button" className="text-xs font-black text-slate-500 hover:text-slate-800" onClick={() => setEditingField((prev) => (prev === field.key ? '' : field.key))}>
                    ✎
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {canWriteCustomers ? (
          <div className="flex justify-end">
            <Button variant="primary" onClick={onSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
