import { Archive, FileSpreadsheet, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="جست‌وجو..."
            className="!w-48"
          />
          <span className="whitespace-nowrap text-xs font-bold text-slate-400">
            {toPN(employees.length)} نتیجه
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={onReload}
            disabled={loading || busyKey !== ''}
            title="بازخوانی"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="icon"
            variant={archiveMode ? 'secondary' : 'ghost'}
            onClick={onArchiveModeToggle}
            disabled={busyKey !== ''}
            title={archiveMode ? 'بازگشت به لیست اصلی' : 'آرشیو'}
          >
            <Archive className="h-4 w-4" />
          </Button>
          {canWriteEmployees && !archiveMode ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onOpenImport}
              disabled={busyKey !== ''}
              title="ورود از اکسل"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          ) : null}
          {canWriteEmployees && !archiveMode ? (
            <Button size="sm" variant="success" onClick={onNewEmployee} disabled={busyKey !== ''}>
              + ثبت پرسنل جدید
            </Button>
          ) : null}
          {!canWriteEmployees ? <Badge tone="neutral" className="px-3 py-1.5 text-[11px]">فقط مشاهده</Badge> : null}
        </div>
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
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2.5">کد</th>
                <th className="px-3 py-2.5 text-right">نام</th>
                <th className="px-3 py-2.5">واحد</th>
                <th className="px-3 py-2.5">سمت</th>
                <th className="px-3 py-2.5">حقوق پایه</th>
                <th className="px-3 py-2.5">وضعیت</th>
                {canWriteEmployees ? <th className="px-3 py-2.5">عملیات</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {employees.map((employee) => (
                <tr key={employee.id || employee.employeeCode} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2.5 font-black text-slate-900">{toPN(employee.employeeCode || '-')}</td>
                  <td className="px-3 py-2.5 text-right font-black text-slate-900">{displayName(employee)}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-600">{employee.department || '-'}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-600">{employee.jobTitle || '-'}</td>
                  <td className="px-3 py-2.5 font-black text-slate-900">{formatMoney(employee.baseSalary)}</td>
                  <td className="px-3 py-2.5"><EmployeeStatusBadge employee={employee} /></td>
                  {canWriteEmployees ? (
                    <td className="px-3 py-2">
                      {!archiveMode ? (
                        <div className="flex items-center justify-center gap-1">
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
