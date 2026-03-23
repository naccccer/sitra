import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
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

export function gregorianToShamsiPickerValue(value) {
  if (!value) return null
  try {
    return new DateObject({ date: value, calendar: gregorian, locale: gregorianEn }).convert(
      persian,
      persianFa,
    )
  } catch {
    return null
  }
}

export function shamsiPickerValueToGregorian(dateObj) {
  if (!dateObj) return ''
  try {
    const greg = new DateObject(dateObj).convert(gregorian, gregorianEn)
    return greg.format('YYYY-MM-DD')
  } catch {
    return ''
  }
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
