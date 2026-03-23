import { Button, Card, Input, Select } from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { normalizeDigitsToLatin, toPN } from '@/utils/helpers'

function formatMoney(value) {
  return toPN(Math.round(Number(value || 0)).toLocaleString('en-US'))
}

function displayName(employee = {}) {
  return employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '-'
}

function normalizeNumericInput(value) {
  return normalizeDigitsToLatin(value).replace(/[^\d]/g, '')
}

function StatusPill({ isActive }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${isActive === false ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
      {isActive === false ? 'غیرفعال' : 'فعال'}
    </span>
  )
}

export function HumanResourcesWorkspace({
  busyKey,
  canWriteEmployees,
  employees,
  error,
  form,
  formError,
  loading,
  onClearForm,
  onEditEmployee,
  onFormChange,
  onLoadEmployees,
  onNewEmployee,
  onQueryChange,
  onStatusFilterChange,
  onSubmitForm,
  onDeleteEmployee,
  onToggleEmployeeActive,
  query,
  statusFilter,
}) {
  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">منابع انسانی</div>
            <div className="text-xs font-bold text-slate-500">مرجع سبک اطلاعات پرسنل برای استفاده در حقوق و دستمزد</div>
          </div>
          <Button size="sm" variant="ghost" onClick={onLoadEmployees} disabled={loading || busyKey !== ''}>
            {loading ? 'در حال بازخوانی...' : 'بازخوانی'}
          </Button>
        </div>
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[1.6fr_.7fr_auto]">
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجو بر اساس کد، نام، واحد یا سمت" />
          <Select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="all">همه وضعیت ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </Select>
          {canWriteEmployees ? (
            <Button variant="primary" onClick={onNewEmployee} disabled={busyKey !== ''}>پرسنل جدید</Button>
          ) : (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">فقط مشاهده</div>
          )}
        </div>
        <div className="text-xs font-bold text-slate-500">{employees.length} نتیجه</div>
      </Card>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[1.15fr_.85fr]">
        <Card padding="md" className="overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">فهرست پرسنل</div>
              <div className="text-xs font-bold text-slate-500">اطلاعات این بخش به صورت مستقیم در حقوق و دستمزد مصرف می‌شود.</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="px-3 py-2">کد</th>
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">واحد</th>
                  <th className="px-3 py-2">سمت</th>
                  <th className="px-3 py-2">حقوق پایه</th>
                  <th className="px-3 py-2">وضعیت</th>
                  {canWriteEmployees && <th className="px-3 py-2">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {employees.map((employee) => (
                  <tr key={employee.id || employee.employeeCode} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-black text-slate-900">{toPN(employee.employeeCode || '-')}</td>
                    <td className="px-3 py-2 font-black text-slate-700">{displayName(employee)}</td>
                    <td className="px-3 py-2 text-slate-500">{employee.department || '-'}</td>
                    <td className="px-3 py-2 text-slate-500">{employee.jobTitle || '-'}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{formatMoney(employee.baseSalary)}</td>
                    <td className="px-3 py-2"><StatusPill isActive={employee.isActive} /></td>
                    {canWriteEmployees && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => onEditEmployee(employee)} disabled={busyKey !== ''}>ویرایش</Button>
                          <Button size="sm" variant="secondary" onClick={() => onToggleEmployeeActive(employee)} disabled={busyKey !== ''}>
                            {busyKey === `toggle:${employee.id}` ? 'در حال تغییر...' : employee.isActive === false ? 'فعال‌سازی' : 'غیرفعال‌سازی'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => onDeleteEmployee(employee)} disabled={busyKey !== ''}>
                            {busyKey === `delete:${employee.id}` ? 'در حال حذف...' : 'حذف'}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!loading && employees.length === 0 && (
                  <tr>
                    <td colSpan={canWriteEmployees ? 7 : 6} className="px-3 py-10 text-center font-bold text-slate-400">پرسنلی برای نمایش وجود ندارد.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={canWriteEmployees ? 7 : 6} className="px-3 py-10 text-center font-bold text-slate-400">در حال بارگذاری...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card padding="md" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">{form.id ? 'ویرایش پرسنل' : 'ثبت پرسنل جدید'}</div>
              <div className="text-xs font-bold text-slate-500">فیلدهای ضروری برای حقوق و دستمزد و واحد منابع انسانی</div>
            </div>
            {form.id && canWriteEmployees && <Button size="sm" variant="ghost" onClick={onNewEmployee} disabled={busyKey !== ''}>جدید</Button>}
          </div>

          {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{formError}</div>}

          {canWriteEmployees ? (
            <form className="space-y-3" onSubmit={onSubmitForm}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={toPN(form.employeeCode || '')} onChange={(event) => onFormChange('employeeCode', normalizeNumericInput(event.target.value))} placeholder="کد پرسنلی" />
                <Input value={toPN(form.personnelNo || '')} onChange={(event) => onFormChange('personnelNo', normalizeNumericInput(event.target.value))} placeholder="شماره پرسنلی" />
                <Input value={form.firstName} onChange={(event) => onFormChange('firstName', event.target.value)} placeholder="نام" />
                <Input value={form.lastName} onChange={(event) => onFormChange('lastName', event.target.value)} placeholder="نام خانوادگی" />
                <Input value={toPN(form.nationalId || '')} onChange={(event) => onFormChange('nationalId', normalizeNumericInput(event.target.value))} placeholder="کد ملی" />
                <Input value={toPN(form.mobile || '')} onChange={(event) => onFormChange('mobile', normalizeNumericInput(event.target.value))} placeholder="موبایل" />
                <Input value={form.department} onChange={(event) => onFormChange('department', event.target.value)} placeholder="واحد" />
                <Input value={form.jobTitle} onChange={(event) => onFormChange('jobTitle', event.target.value)} placeholder="سمت" />
                <Input value={form.bankName} onChange={(event) => onFormChange('bankName', event.target.value)} placeholder="نام بانک" />
                <Input value={toPN(form.bankAccountNo || '')} onChange={(event) => onFormChange('bankAccountNo', normalizeNumericInput(event.target.value))} placeholder="شماره حساب" />
                <Input value={form.bankSheba} onChange={(event) => onFormChange('bankSheba', event.target.value)} placeholder="شبا" />
                <div className="h-10 rounded-lg border border-slate-200 bg-white px-1">
                  <PriceInput value={form.baseSalary} onChange={(value) => onFormChange('baseSalary', value)} placeholder="حقوق پایه" className="h-8 text-start text-slate-800" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black text-slate-500">یادداشت</div>
                <textarea
                  value={form.notes}
                  onChange={(event) => onFormChange('notes', event.target.value)}
                  className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="توضیحات"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  className="accent-slate-900"
                  checked={form.isActive !== false}
                  onChange={(event) => onFormChange('isActive', event.target.checked)}
                />
                پرسنل فعال باشد
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={busyKey !== ''}>{busyKey === 'save' ? 'در حال ذخیره...' : form.id ? 'ذخیره تغییرات' : 'ایجاد پرسنل'}</Button>
                <Button type="button" variant="secondary" onClick={onClearForm} disabled={busyKey !== ''}>پاک کردن فرم</Button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">برای ایجاد یا ویرایش پرسنل به دسترسی نوشتن منابع انسانی نیاز دارید.</div>
          )}
        </Card>
      </div>
    </div>
  )
}
