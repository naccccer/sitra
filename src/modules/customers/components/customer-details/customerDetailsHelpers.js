import { customerTypeLabel, formatAmount, formatLocation, toPN } from '../../utils/customersView'

export const DETAILS_TABS = [
  { id: 'profile', label: 'پروفایل' },
  { id: 'projects', label: 'پروژه‌ها' },
  { id: 'contacts', label: 'شماره‌ها' },
  { id: 'financial', label: 'مالی' },
]

export const toId = (value) => String(value ?? '')
export const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)
export const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))

export const toNullableNumber = (value) => {
  const raw = toEnglishDigits(value).trim().replace(/[,\u066C]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export const buildProfileRows = (customer) => ([
  ['کد مشتری', customer.customerCode ? toPersianDigits(customer.customerCode) : '-'],
  ['نوع', customerTypeLabel(customer.customerType)],
  ['نام', customer.fullName || '-'],
  ['نام شرکت', customer.companyName || '-'],
  ['تلفن پیش‌فرض', customer.defaultPhone ? toPersianDigits(customer.defaultPhone) : '-'],
  ['ایمیل', customer.email || '-'],
  ['شناسه ملی', customer.nationalId ? toPersianDigits(customer.nationalId) : '-'],
  ['کد اقتصادی', customer.economicCode ? toPersianDigits(customer.economicCode) : '-'],
  ['موقعیت', formatLocation(customer.province, customer.city)],
  ['آدرس', customer.address || '-'],
  ['سقف اعتبار', customer.creditLimit ? formatAmount(customer.creditLimit) : '-'],
  ['مهلت پرداخت', customer.paymentTermDays ? `${toPN(customer.paymentTermDays)} روز` : '-'],
])
