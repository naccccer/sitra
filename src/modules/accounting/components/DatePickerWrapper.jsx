import DatePicker from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import {
  gregorianToShamsiPickerValue,
  shamsiPickerValueToGregorian,
} from '../utils/dateUtils'

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
  const pickerValue = gregorianToShamsiPickerValue(value)

  const handleChange = (dateObj) => {
    onChange(shamsiPickerValueToGregorian(dateObj))
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
