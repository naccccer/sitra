export const DETAILS_TABS = [
  { id: 'profile', label: 'پروفایل' },
  { id: 'projects', label: 'پروژه‌ها' },
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
