import DateObject from 'react-date-object'
import DatePicker from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'

const gregorianToShamsiPickerValue = (value) => {
  if (!value) return null
  try {
    return new DateObject({ date: value, calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa)
  } catch {
    return null
  }
}

const shamsiPickerValueToGregorian = (dateObj) => {
  if (!dateObj) return ''
  try {
    return new DateObject(dateObj).convert(gregorian, gregorianEn).format('YYYY-MM-DD')
  } catch {
    return ''
  }
}

export const InventoryShamsiDateInput = ({ value, onChange, placeholder = 'انتخاب تاریخ' }) => (
  <DatePicker
    value={gregorianToShamsiPickerValue(value)}
    onChange={(dateObj) => onChange(shamsiPickerValueToGregorian(dateObj))}
    calendar={persian}
    locale={persianFa}
    calendarPosition="bottom-right"
    format="YYYY/MM/DD"
    editable={false}
    placeholder={placeholder}
    inputClass="h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-bold text-slate-700"
  />
)
