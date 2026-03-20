import { useMemo, useState } from 'react'
import { Button, Card, Input } from '@/components/shared/ui'
import { Select } from '@/components/shared/ui/Select'
import { toPN } from '@/utils/helpers'
import { formatMoney } from './payrollMath'

const EMPTY_EMPLOYEE = {
  id: '',
  employeeCode: '',
  fullName: '',
  nationalId: '',
  department: '',
  bankAccount: '',
  baseSalary: '',
  isActive: true,
}

export function PayrollEmployeesPanel({ employees, busy, canManage, onSave }) {
  const [draft, setDraft] = useState(EMPTY_EMPLOYEE)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const filteredEmployees = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => [employee.fullName, employee.employeeCode, employee.department]
      .some((value) => String(value || '').toLowerCase().includes(term)))
  }, [employees, query])

  const patchDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!draft.employeeCode || !draft.fullName) {
      setError('کد پرسنلی و نام پرسنل الزامی است.')
      return
    }
    setError('')
    await onSave({
      ...draft,
      baseSalary: Number(draft.baseSalary || 0),
      isActive: draft.isActive !== false,
    })
    setDraft(EMPTY_EMPLOYEE)
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <div className="text-sm font-black text-slate-900">پرسنل حقوق</div>
          <div className="text-xs font-bold text-slate-500">مدیریت اطلاعات ثابت پرسنل و حقوق پایه</div>
        </div>
        <div className="me-auto w-full max-w-56 sm:w-56">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی پرسنل" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.95fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">واحد</th>
                <th className="px-3 py-2">حقوق پایه</th>
                <th className="px-3 py-2">وضعیت</th>
                {canManage && <th className="px-3 py-2">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id || employee.employeeCode} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-black text-slate-900">{toPN(employee.employeeCode || employee.code || '-')}</td>
                  <td className="px-3 py-2 font-bold text-slate-700">{employee.fullName || employee.name || '-'}</td>
                  <td className="px-3 py-2 text-slate-500">{employee.department || '-'}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(employee.baseSalary)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${employee.isActive === false ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      {employee.isActive === false ? 'غیرفعال' : 'فعال'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({
                        ...EMPTY_EMPLOYEE,
                        ...employee,
                        employeeCode: employee.employeeCode || employee.code || '',
                        baseSalary: employee.baseSalary || '',
                      })}>
                        ویرایش
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center font-bold text-slate-400">پرسنلی برای نمایش وجود ندارد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">{draft.id ? 'ویرایش پرسنل' : 'پرسنل جدید'}</div>
            {draft.id && <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_EMPLOYEE)}>جدید</Button>}
          </div>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Input value={draft.employeeCode} onChange={(event) => patchDraft('employeeCode', event.target.value)} placeholder="کد پرسنلی" />
            <Input value={draft.fullName} onChange={(event) => patchDraft('fullName', event.target.value)} placeholder="نام و نام خانوادگی" />
            <Input value={draft.nationalId} onChange={(event) => patchDraft('nationalId', event.target.value)} placeholder="کد ملی" />
            <Input value={draft.department} onChange={(event) => patchDraft('department', event.target.value)} placeholder="واحد / سمت" />
            <Input value={draft.bankAccount} onChange={(event) => patchDraft('bankAccount', event.target.value)} placeholder="شماره حساب / شبا" />
            <Input type="number" value={draft.baseSalary} onChange={(event) => patchDraft('baseSalary', event.target.value)} placeholder="حقوق پایه" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" className="accent-slate-900" checked={draft.isActive !== false} onChange={(event) => patchDraft('isActive', event.target.checked)} />
            پرسنل فعال باشد
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={!canManage || busy}>
              {busy ? 'در حال ذخیره...' : draft.id ? 'ذخیره تغییرات' : 'ایجاد پرسنل'}
            </Button>
            <Select value={String(filteredEmployees.length)} disabled className="max-w-32 bg-white text-center">
              <option>{`تعداد ${toPN(filteredEmployees.length)}`}</option>
            </Select>
          </div>
        </form>
      </div>
    </Card>
  )
}
