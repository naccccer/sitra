import { normalizeDigitsToLatin, toPN } from '@/utils/helpers'

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  const raw = String(value ?? '').trim().toLowerCase()
  if (['true', 'yes', 'on'].includes(raw)) return true
  if (['false', 'no', 'off'].includes(raw)) return false
  return fallback
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(normalizeDigitsToLatin(value) ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

const pickNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue
    return toNumber(value)
  }
  return 0
}

const pickString = (...values) => {
  for (const value of values) {
    const raw = String(value ?? '').trim()
    if (raw) return raw
  }
  return ''
}

export { toPN }

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'individual', label: 'حقیقی' },
  { value: 'company', label: 'حقوقی' },
]

export const ACTIVE_FILTER_OPTIONS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'true', label: 'فقط فعال' },
  { value: 'false', label: 'فقط غیرفعال' },
]

export const CUSTOMER_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'همه نوع‌ها' },
  ...CUSTOMER_TYPE_OPTIONS,
]

export const DUE_FILTER_OPTIONS = [
  { value: 'all', label: 'همه مانده‌ها' },
  { value: 'true', label: 'دارای مانده' },
  { value: 'false', label: 'بدون مانده' },
]

export const PAGE_SIZE_OPTIONS = [25, 50, 100]

export const buildCustomerCode = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) return 'C000000'
  return `C${String(numericId).padStart(6, '0')}`
}

export const customerTypeLabel = (value) => CUSTOMER_TYPE_OPTIONS.find((item) => item.value === value)?.label || 'حقیقی'

export const formatAmount = (value) => toPN(new Intl.NumberFormat('en-US').format(toNumber(value)))

export const formatDateTime = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const formatLocation = (province, city) => {
  const parts = [province, city].map((item) => String(item ?? '').trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '-'
}

export const normalizeCustomerRecord = (customer = {}) => {
  const metrics = isObject(customer.metrics) ? customer.metrics : {}
  const financials = isObject(customer.financials) ? customer.financials : metrics
  const id = String(customer.id ?? '')
  const customerCode = pickString(customer.customerCode, customer.customer_code, customer.code, buildCustomerCode(id))
  const companyName = pickString(customer.companyName, customer.company_name)
  const customerType = pickString(customer.customerType, customer.customer_type, customer.type) || (companyName ? 'company' : 'individual')

  return {
    ...customer,
    id,
    customerCode,
    fullName: pickString(customer.fullName, customer.full_name, companyName),
    customerType: customerType === 'company' ? 'company' : 'individual',
    companyName,
    nationalId: pickString(customer.nationalId, customer.national_id),
    economicCode: pickString(customer.economicCode, customer.economic_code),
    email: pickString(customer.email),
    province: pickString(customer.province),
    city: pickString(customer.city),
    address: pickString(customer.address),
    notes: pickString(customer.notes),
    defaultPhone: pickString(customer.defaultPhone, customer.default_phone),
    creditLimit: pickNumber(customer.creditLimit, customer.credit_limit),
    paymentTermDays: pickNumber(customer.paymentTermDays, customer.payment_term_days),
    isActive: toBool(customer.isActive ?? customer.is_active, true),
    activeProjectsCount: pickNumber(customer.activeProjectsCount, customer.active_projects_count, metrics.activeProjectsCount, metrics.projectsCount),
    activeContactsCount: pickNumber(customer.activeContactsCount, customer.active_contacts_count, metrics.activeContactsCount, metrics.contactsCount),
    activeOrdersCount: pickNumber(customer.activeOrdersCount, customer.active_orders_count, metrics.activeOrdersCount, metrics.ordersCount),
    totalAmount: pickNumber(customer.totalAmount, customer.total_amount, financials.totalAmount, financials.total, metrics.totalAmount),
    paidAmount: pickNumber(customer.paidAmount, customer.paid_amount, financials.paidAmount, financials.paidTotal, metrics.paidAmount),
    dueAmount: pickNumber(customer.dueAmount, customer.due_amount, financials.dueAmount, financials.due, metrics.dueAmount),
    createdAt: customer.createdAt || customer.created_at || '',
    updatedAt: customer.updatedAt || customer.updated_at || '',
  }
}

export const createCustomerDraft = (customer = null) => ({
  id: String(customer?.id ?? ''),
  customerCode: String(customer?.customerCode ?? customer?.customer_code ?? ''),
  customerType: String(customer?.customerType ?? customer?.customer_type ?? 'individual'),
  fullName: String(customer?.fullName ?? customer?.full_name ?? ''),
  companyName: String(customer?.companyName ?? customer?.company_name ?? ''),
  nationalId: String(customer?.nationalId ?? customer?.national_id ?? ''),
  economicCode: String(customer?.economicCode ?? customer?.economic_code ?? ''),
  defaultPhone: String(customer?.defaultPhone ?? customer?.default_phone ?? ''),
  email: String(customer?.email ?? ''),
  province: String(customer?.province ?? ''),
  city: String(customer?.city ?? ''),
  address: String(customer?.address ?? ''),
  notes: String(customer?.notes ?? ''),
  creditLimit: String(customer?.creditLimit ?? customer?.credit_limit ?? ''),
  paymentTermDays: String(customer?.paymentTermDays ?? customer?.payment_term_days ?? ''),
  applyToOrderHistory: false,
  isActive: customer ? toBool(customer.isActive ?? customer.is_active, true) : true,
})

export const createProjectDraft = (project = null, customerId = '') => ({
  id: String(project?.id ?? ''),
  customerId: String(project?.customerId ?? project?.customer_id ?? customerId ?? ''),
  targetCustomerId: String(project?.targetCustomerId ?? project?.customerId ?? project?.customer_id ?? customerId ?? ''),
  name: String(project?.name ?? ''),
  notes: String(project?.notes ?? ''),
  isDefault: Boolean(project?.isDefault ?? project?.is_default),
  isActive: project ? toBool(project.isActive ?? project.is_active, true) : true,
})

export const createContactDraft = (contact = null, projectId = '') => ({
  id: String(contact?.id ?? ''),
  projectId: String(contact?.projectId ?? contact?.project_id ?? projectId ?? ''),
  label: String(contact?.label ?? 'main'),
  phone: String(contact?.phone ?? ''),
  sortOrder: String(contact?.sortOrder ?? contact?.sort_order ?? '100'),
  isPrimary: Boolean(contact?.isPrimary ?? contact?.is_primary),
  isActive: contact ? toBool(contact.isActive ?? contact.is_active, true) : true,
})

