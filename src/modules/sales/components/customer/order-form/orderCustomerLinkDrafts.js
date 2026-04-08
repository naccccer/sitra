import { normalizeDigitsToLatin } from '@/utils/helpers'

const toText = (value) => String(value ?? '').trim()

export const toEnglishDigits = (value) => normalizeDigitsToLatin(value)

export const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

export const normalizeSearch = (value) => toText(toEnglishDigits(value)).toLowerCase()

export const createCustomerLinkDraft = (customer = null, customerInfo = {}) => ({
  fullName: toText(customer?.fullName || customerInfo?.name),
  defaultPhone: toText(customer?.defaultPhone || customerInfo?.phone),
  applyToOrderHistory: false,
})

export const createProjectLinkDraft = (project = null) => ({
  name: toText(project?.name),
  notes: toText(project?.notes),
  isDefault: Boolean(project?.isDefault),
})

export const createContactLinkDraft = (contact = null, customerInfo = {}) => ({
  label: toText(contact?.label || 'main'),
  phone: toText(contact?.phone || customerInfo?.phone),
  isPrimary: Boolean(contact ? contact.isPrimary : true),
})

export const validateCustomerLinkDraft = (draft) => {
  const fullName = toText(draft?.fullName)
  const phone = toText(toEnglishDigits(draft?.defaultPhone))

  if (!fullName) return 'نام مشتری را وارد کنید.'
  if (fullName.length < 2) return 'نام مشتری باید حداقل ۲ کاراکتر باشد.'
  if (phone && phone.length < 5) return 'شماره تماس مشتری معتبر نیست.'
  return ''
}

export const validateProjectLinkDraft = (draft) => (
  toText(draft?.name) ? '' : 'نام پروژه را وارد کنید.'
)

export const validateContactLinkDraft = (draft) => {
  const phone = toText(toEnglishDigits(draft?.phone))
  if (!phone) return 'شماره تماس پروژه را وارد کنید.'
  if (phone.length < 5) return 'شماره تماس پروژه معتبر نیست.'
  return ''
}
