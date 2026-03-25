import { useMemo, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Input } from '@/components/shared/ui'

const OPTIONAL_FIELDS = [
  { key: 'notes', label: 'یادداشت' },
  { key: 'province', label: 'استان' },
  { key: 'city', label: 'شهر' },
]

const FIELDS = [
  { key: 'fullName', label: 'نام', placeholder: 'نام مشتری *' },
  { key: 'defaultPhone', label: 'تلفن پیش‌فرض', placeholder: 'تلفن پیش‌فرض', inputMode: 'tel' },
  { key: 'address', label: 'آدرس', placeholder: 'آدرس' },
]

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))

const hasDisplayValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''

function FieldCard({
  field,
  value,
  draftValue,
  isEditing,
  canWriteCustomers,
  label,
  isLabelEditing,
  labelDraft,
  onToggleEdit,
  onToggleLabelEdit,
  onDeleteField,
  onLabelDraftChange,
  onLabelDraftCommit,
  onValueChange,
}) {
  const displayValue = hasDisplayValue(value) ? String(value) : '—'

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm ${field.className || ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {isLabelEditing && canWriteCustomers ? (
            <Input
              value={labelDraft}
              onChange={(event) => onLabelDraftChange(event.target.value)}
              onBlur={onLabelDraftCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onLabelDraftCommit()
                if (event.key === 'Escape') onToggleLabelEdit()
              }}
              className="h-8 w-32 px-2 text-[11px]"
            />
          ) : (
            <span className="truncate text-[11px] font-bold text-slate-500">{label}</span>
          )}
          {canWriteCustomers && field.allowLabelEdit ? (
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              onClick={onToggleLabelEdit}
              aria-label={`ویرایش برچسب ${label}`}
              title={`ویرایش برچسب ${label}`}
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {canWriteCustomers ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              onClick={onToggleEdit}
              aria-label={`ویرایش ${label}`}
              title={`ویرایش ${label}`}
            >
              <PencilLine className="h-4 w-4" />
            </button>
            {field.allowDelete ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                onClick={onDeleteField}
                aria-label={`حذف ${label}`}
                title={`حذف ${label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2.5">
        {isEditing && canWriteCustomers ? (
          <Input
            value={draftValue}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            dir={field.dir}
            className="h-10"
          />
        ) : (
          <div className="break-words rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-800">
            {displayValue}
          </div>
        )}
      </div>
    </div>
  )
}

export const CustomerDetailsProfileTab = ({
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

  const fields = useMemo(() => [...FIELDS, ...OPTIONAL_FIELDS.filter((field) => visibleOptional.includes(field.key))], [visibleOptional])
  const baseFields = fields.filter((field) => FIELDS.some((baseField) => baseField.key === field.key))
  const optionalFields = fields.filter((field) => !FIELDS.some((baseField) => baseField.key === field.key))

  const setField = (key, value) => setEditDraft((prev) => ({ ...prev, [key]: value }))

  const addField = () => {
    const next = OPTIONAL_FIELDS.find((field) => !visibleOptional.includes(field.key))
    if (!next) return
    setVisibleOptional((prev) => [...prev, next.key])
    setCustomLabels((prev) => ({ ...prev, [next.key]: 'فیلد' }))
    setEditingField(next.key)
  }

  const setCustomLabel = (key, value) => setCustomLabels((prev) => ({ ...prev, [key]: value }))

  const removeField = (key) => {
    setVisibleOptional((prev) => prev.filter((itemKey) => itemKey !== key))
    setEditingField((prev) => (prev === key ? '' : prev))
    setEditingLabelField((prev) => (prev === key ? '' : prev))
    setCustomLabels((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div className="mt-3">
      <Card tone="muted" className="space-y-3" padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">پروفایل مشتری</div>
            <div className="mt-1 text-xs font-bold leading-6 text-slate-500">
              نام، تلفن و آدرس را اینجا نگه دارید و فیلدهای تکمیلی را در ادامه همان لیست ببینید.
            </div>
          </div>
          {canWriteCustomers ? (
            <Button variant="secondary" size="sm" onClick={addField}>
              <Plus className="h-4 w-4" />
              افزودن فیلد
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {baseFields.map((field) => (
            <FieldCard
              key={field.key}
              field={field}
              value={editDraft[field.key]}
              draftValue={editDraft[field.key] || ''}
              isEditing={editingField === field.key}
              canWriteCustomers={canWriteCustomers}
              label={field.label}
              isLabelEditing={editingLabelField === field.key}
              labelDraft={customLabels[field.key] ?? field.label}
              onToggleEdit={() => setEditingField((prev) => (prev === field.key ? '' : field.key))}
              onToggleLabelEdit={() => {
                if (!canWriteCustomers) return
                setEditingLabelField((prev) => (prev === field.key ? '' : field.key))
                setEditingField((prev) => (prev === field.key ? '' : prev))
              }}
              onDeleteField={() => removeField(field.key)}
              onLabelDraftChange={(value) => setCustomLabel(field.key, value || 'فیلد')}
              onLabelDraftCommit={() => setEditingLabelField('')}
              onValueChange={(value) => setField(field.key, field.inputMode ? toEnglishDigits(value) : value)}
            />
          ))}
          {optionalFields.map((field) => {
            const label = customLabels[field.key] || field.label
            return (
              <FieldCard
                key={field.key}
                field={{
                  ...field,
                  allowLabelEdit: true,
                  allowDelete: true,
                }}
                value={editDraft[field.key]}
                draftValue={editDraft[field.key] || ''}
                isEditing={editingField === field.key}
                canWriteCustomers={canWriteCustomers}
                label={label}
                isLabelEditing={editingLabelField === field.key}
                labelDraft={customLabels[field.key] ?? field.label}
                onToggleEdit={() => setEditingField((prev) => (prev === field.key ? '' : field.key))}
                onToggleLabelEdit={() => {
                  if (!canWriteCustomers) return
                  setEditingLabelField((prev) => (prev === field.key ? '' : field.key))
                  setEditingField((prev) => (prev === field.key ? '' : prev))
                }}
                onDeleteField={() => removeField(field.key)}
                onLabelDraftChange={(value) => setCustomLabel(field.key, value || 'فیلد')}
                onLabelDraftCommit={() => setEditingLabelField('')}
                onValueChange={(value) => setField(field.key, field.inputMode ? toEnglishDigits(value) : value)}
              />
            )
          })}
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
