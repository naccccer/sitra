import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { displayName, formatMoney, hasMissingPayrollData } from '../utils/humanResourcesView'

function EmployeeStatusBadge({ employee }) {
  if (employee.isActive === false) {
    return <Badge tone="neutral">آرشیو</Badge>
  }
  if (hasMissingPayrollData(employee)) {
    return <Badge tone="warning">داده ناقص</Badge>
  }
  return <Badge tone="success">کامل</Badge>
}

export function HumanResourcesDirectoryPanel({
  archiveMode,
  busyKey,
  canWriteEmployees,
  employees,
  loading,
  onArchiveEmployee,
  onArchiveModeToggle,
  onEditEmployee,
  onOpenImport,
  onNewEmployee,
  onQueryChange,
  onReload,
  onRestoreEmployee,
  query,
}) {
  return (
    <Card padding="md" className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">مرور پرسنل</div>
            <div className="text-xs font-bold text-slate-500">
              {archiveMode ? 'آرشیو پرسنل' : 'فهرست پرسنل'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onReload} disabled={loading || busyKey !== ''}>
              {loading ? 'در حال بازخوانی...' : 'بازخوانی'}
            </Button>
            {canWriteEmployees && !archiveMode ? (
              <Button size="sm" variant="secondary" onClick={onOpenImport} disabled={busyKey !== ''}>
                ورود از اکسل
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onArchiveModeToggle} disabled={busyKey !== ''}>
              {archiveMode ? 'بازگشت به لیست اصلی' : 'آرشیو'}
            </Button>
            {canWriteEmployees && !archiveMode ? (
              <Button variant="success" onClick={onNewEmployee} disabled={busyKey !== ''}>ثبت پرسنل جدید</Button>
            ) : null}
            {!canWriteEmployees ? <Badge tone="neutral" className="px-3 py-1.5 text-[11px]">فقط مشاهده</Badge> : null}
          </div>
        </div>

        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="جست‌وجو بر اساس کد، نام، واحد یا سمت" />
        <div className="text-xs font-bold text-slate-500">{toPN(employees.length)} نتیجه</div>
      </div>

      {loading ? (
        <EmptyState
          title="در حال بارگذاری پرسنل"
          description="فهرست پرسنل در حال بازخوانی است."
          className="border border-dashed border-slate-200"
        />
      ) : employees.length === 0 ? (
        <EmptyState
          title={archiveMode ? 'پرسنل آرشیوشده‌ای وجود ندارد' : 'پرسنلی برای نمایش وجود ندارد'}
          description={archiveMode ? 'اگر رکوردی آرشیو شود، از این مسیر قابل بازیابی خواهد بود.' : 'جست‌وجو را تغییر بدهید یا یک پرسنل جدید ثبت کنید.'}
          className="border border-dashed border-slate-200"
          action={canWriteEmployees && !archiveMode ? <Button variant="success" onClick={onNewEmployee}>ثبت پرسنل</Button> : null}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">واحد</th>
                <th className="px-3 py-2">سمت</th>
                <th className="px-3 py-2">حقوق پایه</th>
                <th className="px-3 py-2">وضعیت داده</th>
                {canWriteEmployees ? <th className="px-3 py-2">عملیات</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {employees.map((employee) => (
                <tr key={employee.id || employee.employeeCode} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-black text-slate-900">{toPN(employee.employeeCode || '-')}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{displayName(employee)}</td>
                  <td className="px-3 py-2 font-bold text-slate-600">{employee.department || '-'}</td>
                  <td className="px-3 py-2 font-bold text-slate-600">{employee.jobTitle || '-'}</td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(employee.baseSalary)}</td>
                  <td className="px-3 py-2"><EmployeeStatusBadge employee={employee} /></td>
                  {canWriteEmployees ? (
                    <td className="px-3 py-2">
                      {!archiveMode ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEditEmployee(employee)}
                            disabled={busyKey !== ''}
                            title="ویرایش"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="danger"
                            onClick={() => onArchiveEmployee(employee)}
                            disabled={busyKey !== ''}
                            title="انتقال به آرشیو"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="success"
                          onClick={() => onRestoreEmployee(employee)}
                          disabled={busyKey !== ''}
                          title="بازیابی"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
