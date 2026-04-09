import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  Input,
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { toPN } from '@/utils/helpers'
import { formatMoney, formatNumber } from './payrollMath'

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
    <Card padding="md" className="space-y-4" dir="rtl">
      <WorkspaceToolbar>
        <FilterRow className="justify-between gap-3">
          <div>
            <div className="text-sm font-black text-[rgb(var(--ui-text))]">پرسنل حقوق</div>
            <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">مدیریت اطلاعات ثابت پرسنل و حقوق پایه</div>
          </div>
          <div className="w-full max-w-56 sm:w-56">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی پرسنل" size="sm" />
          </div>
        </FilterRow>
      </WorkspaceToolbar>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.95fr]">
        <DataTable minWidthClass="min-w-[760px]">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>کد</DataTableHeaderCell>
              <DataTableHeaderCell>نام</DataTableHeaderCell>
              <DataTableHeaderCell align="center">واحد</DataTableHeaderCell>
              <DataTableHeaderCell align="center">حقوق پایه</DataTableHeaderCell>
              <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
              {canManage ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {filteredEmployees.length === 0 ? (
              <DataTableState colSpan={canManage ? 6 : 5} title="پرسنلی برای نمایش وجود ندارد." />
            ) : filteredEmployees.map((employee) => (
              <DataTableRow key={employee.id || employee.employeeCode} tone={employee.isActive === false ? 'muted' : 'default'}>
                <DataTableCell tone="emphasis" className="font-mono">{toPN(employee.employeeCode || employee.code || '-')}</DataTableCell>
                <DataTableCell tone="emphasis">{employee.fullName || employee.name || '-'}</DataTableCell>
                <DataTableCell align="center">{employee.department || '-'}</DataTableCell>
                <DataTableCell align="center" tone="emphasis">{formatMoney(employee.baseSalary)}</DataTableCell>
                <DataTableCell align="center">
                  <Badge tone={employee.isActive === false ? 'neutral' : 'success'}>{employee.isActive === false ? 'غیرفعال' : 'فعال'}</Badge>
                </DataTableCell>
                {canManage ? (
                  <DataTableCell align="center">
                    <DataTableActions>
                      <IconButton
                        action="edit"
                        label="ویرایش پرسنل"
                        tooltip="ویرایش پرسنل"
                        onClick={() => setDraft({
                          ...EMPTY_EMPLOYEE,
                          ...employee,
                          employeeCode: employee.employeeCode || employee.code || '',
                          baseSalary: employee.baseSalary || '',
                        })}
                      />
                    </DataTableActions>
                  </DataTableCell>
                ) : null}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>

        <form onSubmit={submit} className="space-y-3 rounded-[var(--radius-xl)] border border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))]/65 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-[rgb(var(--ui-text))]">{draft.id ? 'ویرایش پرسنل' : 'پرسنل جدید'}</div>
            {draft.id ? <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_EMPLOYEE)}>جدید</Button> : null}
          </div>
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Input value={draft.employeeCode} onChange={(event) => patchDraft('employeeCode', event.target.value)} placeholder="کد پرسنلی" />
            <Input value={draft.fullName} onChange={(event) => patchDraft('fullName', event.target.value)} placeholder="نام و نام خانوادگی" />
            <Input value={draft.nationalId} onChange={(event) => patchDraft('nationalId', event.target.value)} placeholder="کد ملی" />
            <Input value={draft.department} onChange={(event) => patchDraft('department', event.target.value)} placeholder="واحد / سمت" />
            <Input value={draft.bankAccount} onChange={(event) => patchDraft('bankAccount', event.target.value)} placeholder="شماره حساب / شبا" />
            <div className="h-10 rounded-lg border border-slate-200 bg-white px-1">
              <PriceInput value={draft.baseSalary} onChange={(value) => patchDraft('baseSalary', value)} placeholder="حقوق پایه" className="text-slate-800" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
            <input type="checkbox" className="accent-slate-900" checked={draft.isActive !== false} onChange={(event) => patchDraft('isActive', event.target.checked)} />
            پرسنل فعال باشد
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" action="save" showActionIcon size="sm" disabled={!canManage || busy}>
              {busy ? 'در حال ذخیره...' : draft.id ? 'ذخیره تغییرات' : 'ایجاد پرسنل'}
            </Button>
            <Select value={String(filteredEmployees.length)} disabled className="max-w-32 bg-white text-center">
              <option>{`تعداد ${formatNumber(filteredEmployees.length)}`}</option>
            </Select>
          </div>
        </form>
      </div>
    </Card>
  )
}
