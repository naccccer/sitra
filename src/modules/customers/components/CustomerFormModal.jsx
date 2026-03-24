import { useEffect, useMemo, useState } from 'react'
import { ModalShell, Button, Input, Select } from '@/components/shared/ui'
import { customersApi } from '../services/customersApi'
import { CUSTOMER_TYPE_OPTIONS, createCustomerDraft } from '../utils/customersView'

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

const toNullableNumber = (value) => {
  const raw = toEnglishDigits(value).trim().replace(/[,\u066C]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
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

  useEffect(() => {
    if (!isOpen) return
    setDraft(createCustomerDraft(customer))
    setError('')
    setIsSaving(false)
  }, [customer, isOpen])

  const title = useMemo(() => (isEdit ? 'ویرایش مشتری' : 'مشتری جدید'), [isEdit])

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

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
        customerType: String(draft.customerType || 'individual'),
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
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving || !canWriteCustomers}>
            {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
        </div>
      }
    >
      {error ? <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Input value={toPersianDigits(draft.customerCode)} onChange={(event) => setField('customerCode', toEnglishDigits(event.target.value))} placeholder="کد مشتری" inputMode="numeric" />
        <Select value={draft.customerType} onChange={(event) => setField('customerType', event.target.value)}>
          {CUSTOMER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        <Input value={draft.fullName} onChange={(event) => setField('fullName', event.target.value)} placeholder="نام مشتری *" />
        <Input value={draft.companyName} onChange={(event) => setField('companyName', event.target.value)} placeholder="نام شرکت" />
        <Input value={toPersianDigits(draft.defaultPhone)} onChange={(event) => setField('defaultPhone', toEnglishDigits(event.target.value))} placeholder="تلفن پیش‌فرض" inputMode="tel" />
        <Input value={draft.email} onChange={(event) => setField('email', event.target.value)} placeholder="ایمیل" dir="ltr" />
        <Input value={toPersianDigits(draft.nationalId)} onChange={(event) => setField('nationalId', toEnglishDigits(event.target.value))} placeholder="شناسه ملی" inputMode="numeric" />
        <Input value={toPersianDigits(draft.economicCode)} onChange={(event) => setField('economicCode', toEnglishDigits(event.target.value))} placeholder="کد اقتصادی" inputMode="numeric" />
        <Input value={draft.province} onChange={(event) => setField('province', event.target.value)} placeholder="استان" />
        <Input value={draft.city} onChange={(event) => setField('city', event.target.value)} placeholder="شهر" />
        <Input value={toPersianDigits(draft.creditLimit)} onChange={(event) => setField('creditLimit', toEnglishDigits(event.target.value))} placeholder="سقف اعتبار" inputMode="numeric" />
        <Input value={toPersianDigits(draft.paymentTermDays)} onChange={(event) => setField('paymentTermDays', toEnglishDigits(event.target.value))} placeholder="مهلت پرداخت (روز)" inputMode="numeric" />
        <Input value={draft.address} onChange={(event) => setField('address', event.target.value)} placeholder="آدرس" className="md:col-span-2 lg:col-span-3" />
        <Input value={draft.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="یادداشت" className="md:col-span-2 lg:col-span-3" />
        {isEdit ? (
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={Boolean(draft.applyToOrderHistory)} onChange={(event) => setField('applyToOrderHistory', event.target.checked)} />
            اعمال نام/تلفن روی سفارش‌های قبلی
          </label>
        ) : null}
      </div>
      {!isEdit ? (
        <div className="mt-3 text-[11px] font-bold text-slate-500">
          کد مشتری می‌تواند خالی بماند؛ در این حالت سیستم پس از ذخیره آن را خودکار تولید می‌کند.
        </div>
      ) : null}
    </ModalShell>
  )
}
