import { Button, Input, Select } from '@/components/shared/ui'
import { CUSTOMER_TYPE_OPTIONS } from '../../utils/customersView'

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

export const CustomerDetailsEditTab = ({
  draft,
  setDraft,
  canWriteCustomers = false,
  isSaving = false,
  onSave = () => {},
}) => {
  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Input value={toPersianDigits(draft.customerCode)} onChange={(event) => setField('customerCode', toEnglishDigits(event.target.value))} placeholder="کد مشتری" inputMode="numeric" disabled={!canWriteCustomers} />
        <Select value={draft.customerType || 'individual'} onChange={(event) => setField('customerType', event.target.value)} disabled={!canWriteCustomers}>
          {CUSTOMER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        <Input value={draft.fullName || ''} onChange={(event) => setField('fullName', event.target.value)} placeholder="نام مشتری *" disabled={!canWriteCustomers} />
        <Input value={draft.companyName || ''} onChange={(event) => setField('companyName', event.target.value)} placeholder="نام شرکت" disabled={!canWriteCustomers} />
        <Input value={toPersianDigits(draft.defaultPhone)} onChange={(event) => setField('defaultPhone', toEnglishDigits(event.target.value))} placeholder="تلفن پیش‌فرض" inputMode="tel" disabled={!canWriteCustomers} />
        <Input value={draft.email || ''} onChange={(event) => setField('email', event.target.value)} placeholder="ایمیل" dir="ltr" disabled={!canWriteCustomers} />
        <Input value={toPersianDigits(draft.nationalId)} onChange={(event) => setField('nationalId', toEnglishDigits(event.target.value))} placeholder="شناسه ملی" inputMode="numeric" disabled={!canWriteCustomers} />
        <Input value={toPersianDigits(draft.economicCode)} onChange={(event) => setField('economicCode', toEnglishDigits(event.target.value))} placeholder="کد اقتصادی" inputMode="numeric" disabled={!canWriteCustomers} />
        <Input value={draft.province || ''} onChange={(event) => setField('province', event.target.value)} placeholder="استان" disabled={!canWriteCustomers} />
        <Input value={draft.city || ''} onChange={(event) => setField('city', event.target.value)} placeholder="شهر" disabled={!canWriteCustomers} />
        <Input value={toPersianDigits(draft.creditLimit)} onChange={(event) => setField('creditLimit', toEnglishDigits(event.target.value))} placeholder="سقف اعتبار" inputMode="numeric" disabled={!canWriteCustomers} />
        <Input value={toPersianDigits(draft.paymentTermDays)} onChange={(event) => setField('paymentTermDays', toEnglishDigits(event.target.value))} placeholder="مهلت پرداخت (روز)" inputMode="numeric" disabled={!canWriteCustomers} />
        <Input value={draft.address || ''} onChange={(event) => setField('address', event.target.value)} placeholder="آدرس" className="md:col-span-2 lg:col-span-3" disabled={!canWriteCustomers} />
        <Input value={draft.notes || ''} onChange={(event) => setField('notes', event.target.value)} placeholder="یادداشت" className="md:col-span-2 lg:col-span-3" disabled={!canWriteCustomers} />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onSave} disabled={!canWriteCustomers || isSaving}>
          {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات مشتری'}
        </Button>
      </div>
    </div>
  )
}
