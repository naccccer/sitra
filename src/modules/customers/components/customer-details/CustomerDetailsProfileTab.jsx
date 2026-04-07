import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Input } from '@/components/shared/ui'

const OPTIONAL_FIELDS = [
  { key: 'notes', label: 'یادداشت' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
]

const BASE_FIELDS = [
  { key: 'fullName', label: 'نام مشتری', placeholder: 'نام مشتری *' },
  { key: 'defaultPhone', label: 'تلفن پیش‌فرض', placeholder: 'تلفن پیش‌فرض', inputMode: 'tel', dir: 'ltr' },
  { key: 'address', label: 'آدرس', placeholder: 'آدرس', className: 'md:col-span-2' },
]

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const hasDisplayValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''

const ProfileFieldCard = ({
  field,
  value,
  isEditing,
  canWriteCustomers,
  onToggleEdit,
  onDelete,
  onValueChange,
}) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${field.className || ''}`}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="text-xs font-black text-slate-500">{field.label}</div>
      {canWriteCustomers ? (
        <div className="flex items-center gap-1.5">
          <Button variant={isEditing ? 'primary' : 'secondary'} size="sm" onClick={onToggleEdit}>
            {isEditing ? 'ثبت فیلد' : 'ویرایش'}
          </Button>
          {field.allowDelete ? (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>

    {isEditing && canWriteCustomers ? (
      <Input
        value={value || ''}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.placeholder}
        inputMode={field.inputMode}
        dir={field.dir}
        className="h-10"
      />
    ) : (
      <div className="min-h-10 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
        {hasDisplayValue(value) ? String(value) : '—'}
      </div>
    )}
  </div>
)

export const CustomerDetailsProfileTab = ({
  editDraft = {},
  setEditDraft = () => {},
  canWriteCustomers = false,
  onSaveProfile = () => {},
  isSavingProfile = false,
}) => {
  const [editingField, setEditingField] = useState('')
  const [visibleOptional, setVisibleOptional] = useState([])

  const fields = useMemo(
    () => [...BASE_FIELDS, ...OPTIONAL_FIELDS.filter((field) => visibleOptional.includes(field.key))],
    [visibleOptional],
  )

  const setField = (key, value) => setEditDraft((prev) => ({ ...prev, [key]: value }))

  const addField = () => {
    const next = OPTIONAL_FIELDS.find((field) => !visibleOptional.includes(field.key))
    if (!next) return
    setVisibleOptional((prev) => [...prev, next.key])
    setEditingField(next.key)
  }

  const removeField = (key) => {
    setVisibleOptional((prev) => prev.filter((fieldKey) => fieldKey !== key))
    setEditingField((prev) => (prev === key ? '' : prev))
  }

  return (
    <div className="space-y-4">
      <Card tone="muted" className="space-y-4 rounded-2xl" padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">پروفایل مشتری</div>
            <div className="mt-1 text-xs font-bold text-slate-500">اطلاعات پایه مشتری را با ساختار خوانا در همین بخش مدیریت کنید.</div>
          </div>
          {canWriteCustomers ? (
            <Button variant="secondary" size="sm" onClick={addField}>
              <Plus className="h-4 w-4" />
              افزودن فیلد
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <ProfileFieldCard
              key={field.key}
              field={{
                ...field,
                allowDelete: OPTIONAL_FIELDS.some((optionalField) => optionalField.key === field.key),
              }}
              value={editDraft[field.key]}
              isEditing={editingField === field.key}
              canWriteCustomers={canWriteCustomers}
              onToggleEdit={() => setEditingField((prev) => (prev === field.key ? '' : field.key))}
              onDelete={() => removeField(field.key)}
              onValueChange={(value) => setField(field.key, field.inputMode ? toEnglishDigits(value) : value)}
            />
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
