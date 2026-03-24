import { useEffect, useMemo, useState } from 'react'
import { ModalShell, Button, Input } from '@/components/shared/ui'
import { customersApi } from '../services/customersApi'
import { createCustomerDraft } from '../utils/customersView'

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

const toNullableNumber = (value) => {
  const raw = toEnglishDigits(value).trim().replace(/[,\u066C]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const hasValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return Number.isFinite(value)
  return String(value).trim() !== ''
}

const baseFields = [
  { key: 'fullName', placeholder: 'نام مشتری *' },
  { key: 'defaultPhone', placeholder: 'تلفن پیش‌فرض', inputMode: 'tel' },
  { key: 'address', placeholder: 'آدرس', className: 'md:col-span-2 lg:col-span-3' },
]

const optionalFields = [
  { key: 'customerCode', placeholder: 'کد مشتری', inputMode: 'numeric' },
  { key: 'companyName', placeholder: 'نام شرکت' },
  { key: 'email', placeholder: 'ایمیل', dir: 'ltr' },
  { key: 'nationalId', placeholder: 'شناسه ملی', inputMode: 'numeric' },
  { key: 'economicCode', placeholder: 'کد اقتصادی', inputMode: 'numeric' },
  { key: 'province', placeholder: 'استان' },
  { key: 'city', placeholder: 'شهر' },
  { key: 'creditLimit', placeholder: 'سقف اعتبار', inputMode: 'numeric' },
  { key: 'paymentTermDays', placeholder: 'مهلت پرداخت (روز)', inputMode: 'numeric' },
  { key: 'notes', placeholder: 'یادداشت', className: 'md:col-span-2 lg:col-span-3' },
]

const getInitialVisibleOptional = (draft, isEdit) => {
  if (!isEdit || !draft) return []
  return optionalFields.filter((field) => hasValue(draft[field.key])).map((field) => field.key)
}

export const CustomerFormModal = ({
  isOpen,
  mode = 'create',
  customer = null,
  canWriteCustomers = false,
  onClose,
  onSaved,
}) => {
  const isEdit = mode === 'edit'
  const [draft, setDraft] = useState(() => createCustomerDraft(customer))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [visibleOptional, setVisibleOptional] = useState(() => getInitialVisibleOptional(createCustomerDraft(customer), isEdit))

  useEffect(() => {
    if (!isOpen) return
    const nextDraft = createCustomerDraft(customer)
    setDraft(nextDraft)
    setVisibleOptional(getInitialVisibleOptional(nextDraft, isEdit))
    setError('')
    setIsSaving(false)
  }, [customer, isEdit, isOpen])

  const title = useMemo(() => (isEdit ? 'ویرایش مشتری' : 'مشتری جدید'), [isEdit])

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))
  const addField = () => {
    const next = optionalFields.find((field) => !visibleOptional.includes(field.key))
    if (!next) return
    setVisibleOptional((prev) => [...prev, next.key])
  }

  const handleSubmit = async () => {
    if (!canWriteCustomers) return
    const fullName = String(draft.fullName || '').trim()
    if (!fullName) {
      setError('نام مشتری الزامی است.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const customerCode = String(draft.customerCode || '').trim()
      const payload = {
        ...(isEdit ? { id: Number(customer.id) } : {}),
        ...(customerCode ? { customerCode } : {}),
        customerType: 'individual',
        fullName,
        companyName: String(draft.companyName || '').trim(),
        nationalId: String(draft.nationalId || '').trim(),
        economicCode: String(draft.economicCode || '').trim(),
        defaultPhone: String(draft.defaultPhone || '').trim(),
        email: String(draft.email || '').trim(),
        province: String(draft.province || '').trim(),
        city: String(draft.city || '').trim(),
        address: String(draft.address || '').trim(),
        notes: String(draft.notes || '').trim(),
        creditLimit: toNullableNumber(draft.creditLimit),
        paymentTermDays: toNullableNumber(draft.paymentTermDays),
        ...(isEdit ? { applyToOrderHistory: Boolean(draft.applyToOrderHistory) } : {}),
      }

      const response = isEdit
        ? await customersApi.updateCustomer(payload)
        : await customersApi.createCustomer(payload)

      await onSaved?.(response?.customer || null)
    } catch (err) {
      setError(err?.message || 'ذخیره مشتری ناموفق بود.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      description="مشخصات کامل مشتری و اطلاعات CRM را اینجا ثبت کنید."
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      footer={(
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving || !canWriteCustomers}>
            {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
        </div>
      )}
    >
      {error ? <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div> : null}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-500">اطلاعات ضروری را وارد کنید و در صورت نیاز فیلد اضافه کنید.</div>
        <Button variant="secondary" size="sm" onClick={addField}>+ افزودن فیلد</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {baseFields.map((field) => (
          <Input
            key={field.key}
            value={field.key === 'defaultPhone' ? toPersianDigits(draft[field.key]) : (draft[field.key] || '')}
            onChange={(event) => setField(field.key, field.key === 'defaultPhone' ? toEnglishDigits(event.target.value) : event.target.value)}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            className={field.className}
          />
        ))}
        {optionalFields.filter((field) => visibleOptional.includes(field.key)).map((field) => (
          <Input
            key={field.key}
            value={field.inputMode === 'numeric' || field.inputMode === 'tel' ? toPersianDigits(draft[field.key]) : (draft[field.key] || '')}
            onChange={(event) => setField(field.key, field.inputMode === 'numeric' || field.inputMode === 'tel' ? toEnglishDigits(event.target.value) : event.target.value)}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            dir={field.dir}
            className={field.className}
          />
        ))}
        {isEdit ? (
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={Boolean(draft.applyToOrderHistory)} onChange={(event) => setField('applyToOrderHistory', event.target.checked)} />
            اعمال نام/تلفن روی سفارش‌های قبلی
          </label>
        ) : null}
      </div>
    </ModalShell>
  )
}
