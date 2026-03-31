import {
  Badge,
  Button,
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
  PaginationBar,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { displayName, hasMissingPayrollData } from '../utils/humanResourcesView'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

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
  onNewEmployee,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onReload,
  onRestoreEmployee,
  page,
  pageSize,
  query,
  totalCount,
  totalPages,
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={canWriteEmployees && !archiveMode ? (
          <Button action="create" showActionIcon size="sm" onClick={onNewEmployee} disabled={busyKey !== ''}>ثبت پرسنل جدید</Button>
        ) : null}
        summary={(
          <>
            {!canWriteEmployees ? <Badge tone="neutral">فقط مشاهده</Badge> : null}
            <Badge tone={archiveMode ? 'neutral' : 'accent'}>{archiveMode ? 'حالت: آرشیو' : 'حالت: فعال'}</Badge>
            <Badge tone="neutral">نتیجه: {toPN(totalCount)}</Badge>
          </>
        )}
      >
        <FilterRow className="justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              action="archive"
              variant={archiveMode ? 'primary' : 'secondary'}
              label={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش آرشیو'}
              tooltip={archiveMode ? 'بازگشت به لیست اصلی' : 'نمایش آرشیو'}
              onClick={onArchiveModeToggle}
              disabled={busyKey !== ''}
            />
            <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={onReload} disabled={loading || busyKey !== ''} loading={loading} />
          </div>
          <div className="w-full md:w-64">
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="جست‌وجو..." size="sm" className="bg-white/90" />
          </div>
        </FilterRow>
      </WorkspaceToolbar>

      <DataTable
        minWidthClass="min-w-[860px]"
        footer={employees.length > 0 ? (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell align="center">کد</DataTableHeaderCell>
            <DataTableHeaderCell>نام</DataTableHeaderCell>
            <DataTableHeaderCell align="center">واحد</DataTableHeaderCell>
            <DataTableHeaderCell align="center">سمت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWriteEmployees ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWriteEmployees ? 6 : 5} state="loading" title="در حال بارگذاری پرسنل" />
          ) : employees.length === 0 ? (
            <DataTableState
              colSpan={canWriteEmployees ? 6 : 5}
              title={archiveMode ? 'پرسنل آرشیوشده‌ای وجود ندارد' : 'پرسنلی برای نمایش وجود ندارد'}
              description={archiveMode ? 'اگر رکوردی آرشیو شود، از این مسیر قابل بازیابی خواهد بود.' : 'جست‌وجو را تغییر بدهید یا یک پرسنل جدید ثبت کنید.'}
              action={canWriteEmployees && !archiveMode ? <Button action="create" showActionIcon onClick={onNewEmployee}>ثبت پرسنل</Button> : null}
            />
          ) : employees.map((employee) => (
            <DataTableRow key={employee.id || employee.employeeCode} tone={employee.isActive === false ? 'muted' : 'default'}>
              <DataTableCell align="center" tone="emphasis">{toPN(employee.employeeCode || '-')}</DataTableCell>
              <DataTableCell tone="emphasis">{displayName(employee)}</DataTableCell>
              <DataTableCell align="center">{employee.department || '-'}</DataTableCell>
              <DataTableCell align="center">{employee.jobTitle || '-'}</DataTableCell>
              <DataTableCell align="center"><EmployeeStatusBadge employee={employee} /></DataTableCell>
              {canWriteEmployees ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" label="ویرایش پرسنل" tooltip="ویرایش پرسنل" onClick={() => onEditEmployee(employee)} disabled={busyKey !== ''} />
                        <IconButton action="delete" label="انتقال به آرشیو" tooltip="انتقال به آرشیو" onClick={() => onArchiveEmployee(employee)} disabled={busyKey !== ''} />
                      </>
                    ) : (
                      <IconButton action="restore" label="بازیابی پرسنل" tooltip="بازیابی پرسنل" onClick={() => onRestoreEmployee(employee)} disabled={busyKey !== ''} />
                    )}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
