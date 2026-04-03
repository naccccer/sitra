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
  SegmentedTabs,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { displayName, hasMissingPayrollData } from '../utils/humanResourcesView'

const PAGE_SIZE_OPTIONS = [25, 50, 100]
const HR_TABS = [{ id: 'personnel', label: 'پرسنل' }]

function getEmployeeStatusMeta(employee) {
  if (employee.isActive === false) {
    return { label: 'بایگانی شده', className: 'border border-slate-200 bg-slate-100 text-slate-700' }
  }
  if (hasMissingPayrollData(employee)) {
    return { label: 'داده ناقص', className: 'border border-amber-200 bg-amber-100/85 text-amber-800' }
  }
  return { label: 'فعال', className: 'border border-emerald-200 bg-emerald-100/90 text-emerald-800' }
}

function EmployeeStatusBadge({ employee }) {
  const statusMeta = getEmployeeStatusMeta(employee)
  return <Badge className={`rounded-full !font-semibold shadow-[var(--shadow-soft)] ${statusMeta.className}`} tone="neutral">{statusMeta.label}</Badge>
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
          <SegmentedTabs tabs={HR_TABS} activeId="personnel" className="w-full md:w-auto" />
          <div className="flex w-fit shrink-0 flex-nowrap items-center gap-2" dir="ltr">
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="جست‌وجو..."
              size="sm"
              className="w-64 shrink-0 bg-white/90"
              dir="rtl"
            />
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
            <DataTableHeaderCell align="center" className="text-[12px]">کد</DataTableHeaderCell>
            <DataTableHeaderCell className="text-[12px]">نام</DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="text-[12px]">واحد</DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="text-[12px]">سمت</DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="text-[12px]">وضعیت</DataTableHeaderCell>
            {canWriteEmployees ? <DataTableHeaderCell align="center" className="text-[12px]">عملیات</DataTableHeaderCell> : null}
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
              <DataTableCell
                align="center"
                tone="emphasis"
                className="font-semibold tracking-wider !text-[rgb(28,63,138)]"
                dir="ltr"
              >
                {toPN(employee.employeeCode || '-')}
              </DataTableCell>
              <DataTableCell tone="emphasis" className="text-[12px] text-[rgb(var(--ui-text))]">
                <div className="flex items-center gap-2">
                  <span className="truncate">{displayName(employee)}</span>
                </div>
              </DataTableCell>
              <DataTableCell align="center">{employee.department || '-'}</DataTableCell>
              <DataTableCell align="center">{employee.jobTitle || '-'}</DataTableCell>
              <DataTableCell align="center"><EmployeeStatusBadge employee={employee} /></DataTableCell>
              {canWriteEmployees ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    {!archiveMode ? (
                      <>
                        <IconButton action="edit" size="iconSm" surface="table" label="ویرایش پرسنل" tooltip="ویرایش پرسنل" onClick={() => onEditEmployee(employee)} disabled={busyKey !== ''} />
                        <IconButton action="archive" size="iconSm" surface="table" label="بایگانی پرسنل" tooltip="بایگانی پرسنل" onClick={() => onArchiveEmployee(employee)} disabled={busyKey !== ''} />
                      </>
                    ) : (
                      <IconButton action="restore" size="iconSm" surface="table" label="بازیابی پرسنل" tooltip="بازیابی پرسنل" onClick={() => onRestoreEmployee(employee)} disabled={busyKey !== ''} />
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
