export const DEFAULT_UOM_OPTIONS = [
  'عدد',
  'کیلوگرم',
  'گرم',
  'تن',
  'لیتر',
  'میلی‌لیتر',
  'متر',
  'سانتی‌متر',
  'مترمربع',
  'مترمکعب',
  'بسته',
  'کارتن',
  'جفت',
]

export const normalizeUomOptions = (value) => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean),
  ))
}
