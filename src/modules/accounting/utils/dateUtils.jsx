import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import DatePicker from 'react-multi-date-picker'
import { toPN } from '@/utils/helpers'

/**
 * Converts a Gregorian YYYY-MM-DD string to a Shamsi display string.
 * Returns '-' for empty/invalid input.
 */
export function toShamsiDisplay(isoDate) {
  if (!isoDate) return '-'
  try {
    const d = new DateObject({ date: isoDate, calendar: gregorian, locale: gregorianEn })
    const p = d.convert(persian, persianFa)
    return toPN(p.format('YYYY/MM/DD'))
  } catch {
    return isoDate
  }
}

/**
 * Returns today's date as a Gregorian YYYY-MM-DD string.
 */
export function todayGregorian() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * A date picker component that shows Shamsi calendar but stores/returns Gregorian YYYY-MM-DD.
 *
 * Props:
 *   value      - Gregorian YYYY-MM-DD string (or empty string)
 *   onChange   - called with Gregorian YYYY-MM-DD string (or '' when cleared)
 *   className  - optional class for the input element
 *   placeholder- optional placeholder text
 */
export function ShamsiDateInput({ value, onChange, className, placeholder = 'انتخاب تاریخ' }) {
  // Convert incoming gregorian string to a persian DateObject for the picker
  const pickerValue = value
    ? (() => {
        try {
          return new DateObject({ date: value, calendar: gregorian, locale: gregorianEn }).convert(
            persian,
            persianFa,
          )
        } catch {
          return null
        }
      })()
    : null

  const handleChange = (dateObj) => {
    if (!dateObj) {
      onChange('')
      return
    }
    try {
      const greg = new DateObject(dateObj).convert(gregorian, gregorianEn)
      onChange(greg.format('YYYY-MM-DD'))
    } catch {
      onChange('')
    }
  }

  return (
    <DatePicker
      value={pickerValue}
      onChange={handleChange}
      calendar={persian}
      locale={persianFa}
      calendarPosition="bottom-right"
      format="YYYY/MM/DD"
      editable={false}
      inputClass={
        className ||
        'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 cursor-pointer'
      }
      placeholder={placeholder}
    />
  )
}

export function shamsiMonthKeyToGregorianRange(periodKey) {
  try {
    const [year, month] = String(periodKey || '').split('-')
    if (!year || !month) return null
    const shamsiStart = new DateObject({
      year: Number(year),
      month: Number(month),
      day: 1,
      calendar: persian,
      locale: persianFa,
    })
    const shamsiEnd = new DateObject(shamsiStart).add(1, 'month').subtract(1, 'day')
    return {
      startDate: shamsiStart.convert(gregorian, gregorianEn).format('YYYY-MM-DD'),
      endDate: shamsiEnd.convert(gregorian, gregorianEn).format('YYYY-MM-DD'),
    }
  } catch {
    return null
  }
}
