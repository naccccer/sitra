import {
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
import { formatAmount, PAGE_SIZE_OPTIONS, toPN } from '../utils/customersView'

export const CustomersDirectoryPanel = ({
  archiveMode,
  canWriteCustomers,
  customers,
  loading,
  onArchiveModeToggle,
  onCreateCustomer,
  onDeleteCustomer,
  onOpenDetails,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onReload,
  onRestoreCustomer,
  page,
  pageSize,
  query,
  selectedCustomerId,
  totalCount,
  totalPages,
}) => (
  <div className="space-y-4" dir="rtl">
    <WorkspaceToolbar
      actions={canWriteCustomers && !archiveMode ? <Button action="create" showActionIcon size="sm" onClick={onCreateCustomer}>مشتری جدید</Button> : null}
    >
      <FilterRow className="justify-end gap-3">
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
          />
          <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={onReload} disabled={loading} loading={loading} />
        </div>
      </FilterRow>
    </WorkspaceToolbar>

    <DataTable
      minWidthClass="min-w-[920px]"
      footer={customers.length > 0 ? (
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
          <DataTableHeaderCell align="center">کد مشتری</DataTableHeaderCell>
          <DataTableHeaderCell>نام</DataTableHeaderCell>
          <DataTableHeaderCell align="center">تلفن پیش‌فرض</DataTableHeaderCell>
          <DataTableHeaderCell align="center">سفارش فعال</DataTableHeaderCell>
          <DataTableHeaderCell align="center">جمع فروش</DataTableHeaderCell>
          <DataTableHeaderCell align="center">مانده</DataTableHeaderCell>
          <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {loading ? (
          <DataTableState colSpan={7} state="loading" title="در حال بارگذاری مشتریان" />
        ) : customers.length === 0 ? (
          <DataTableState
            colSpan={7}
            title={archiveMode ? 'مشتری آرشیوشده‌ای وجود ندارد' : 'مشتری برای نمایش وجود ندارد'}
            description={archiveMode ? 'اگر رکوردی آرشیو شود، از این مسیر قابل بازیابی خواهد بود.' : 'جست‌وجو را تغییر بدهید یا یک مشتری جدید ثبت کنید.'}
            action={canWriteCustomers && !archiveMode ? <Button action="create" showActionIcon onClick={onCreateCustomer}>ثبت مشتری</Button> : null}
          />
        ) : customers.map((customer) => (
          <DataTableRow key={customer.id} selected={selectedCustomerId === customer.id} tone={customer.isActive ? 'default' : 'muted'}>
            <DataTableCell
              align="center"
              tone="emphasis"
              className="font-semibold tracking-wider !text-[rgb(28,63,138)]"
              dir="ltr"
            >
              {toPN(customer.customerCode || '-')}
            </DataTableCell>
            <DataTableCell tone="emphasis" className="text-[12px] text-[rgb(var(--ui-text))]">
              <button type="button" className="block w-full text-start" onClick={() => onOpenDetails(customer)}>
                <div className="flex items-center gap-2">
                  <span className="truncate">{customer.fullName || '-'}</span>
                </div>
                {customer.companyName ? <span className="mr-1 text-[9px] font-medium text-[rgb(var(--ui-text-muted))]">{customer.companyName}</span> : null}
              </button>
            </DataTableCell>
            <DataTableCell align="center">
              <span className="inline-flex justify-center text-center font-semibold tabular-nums" dir="ltr">{toPN(customer.defaultPhone || '-')}</span>
            </DataTableCell>
            <DataTableCell align="center" tone="emphasis" className="tabular-nums">{toPN(customer.activeOrdersCount || 0)}</DataTableCell>
            <DataTableCell align="center" tone="emphasis" className="tabular-nums">{formatAmount(customer.totalAmount || 0)}</DataTableCell>
            <DataTableCell align="center" className="tabular-nums font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</DataTableCell>
            <DataTableCell align="center">
              <DataTableActions>
                <IconButton action="openDetails" size="iconSm" surface="table" label="جزئیات مشتری" tooltip="جزئیات مشتری" onClick={() => onOpenDetails(customer)} />
                {canWriteCustomers ? (
                  customer.isActive ? (
                    <IconButton action="archive" size="iconSm" surface="table" label="بایگانی مشتری" tooltip="بایگانی مشتری" onClick={() => onDeleteCustomer(customer)} />
                  ) : (
                    <IconButton action="restore" size="iconSm" surface="table" label="بازیابی مشتری" tooltip="بازیابی مشتری" onClick={() => onRestoreCustomer(customer)} />
                  )
                ) : null}
              </DataTableActions>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  </div>
)
