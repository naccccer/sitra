import { toPN } from '@/utils/helpers'

const PERSIAN_MONTHS = [
  '',
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

export function formatPayrollPeriodTitle(periodKey) {
  const [year, month] = String(periodKey || '').split('-')
  const monthIndex = Number(month)
  if (!year || !Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return String(periodKey || '').trim()
  }
  return `${PERSIAN_MONTHS[monthIndex]} ${toPN(year)}`
}

export function resolvePayrollPeriodTitle(periodKey, title) {
  const normalizedTitle = String(title || '').trim()
  const fallbackTitle = formatPayrollPeriodTitle(periodKey)
  if (!normalizedTitle) return fallbackTitle
  if (/^Payroll\s+\d{4}-\d{2}$/i.test(normalizedTitle)) return fallbackTitle
  return normalizedTitle
}
