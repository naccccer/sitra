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
      summary={(
        <>
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
          />
          <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={onReload} disabled={loading} loading={loading} />
        </div>
        <div className="w-full md:w-64">
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="جست‌وجو..." size="sm" className="bg-white/90" />
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
            <DataTableCell align="center" tone="emphasis" className="font-mono tabular-nums tracking-wider text-sky-700" dir="ltr">
              {toPN(customer.customerCode || '-')}
            </DataTableCell>
            <DataTableCell>
              <button type="button" className="block w-full text-start" onClick={() => onOpenDetails(customer)}>
                <div className="truncate text-[rgb(var(--ui-text))]">{customer.fullName || '-'}</div>
                {customer.companyName ? <div className="mt-0.5 truncate text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{customer.companyName}</div> : null}
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
                <IconButton action="openDetails" label="جزئیات مشتری" tooltip="جزئیات مشتری" onClick={() => onOpenDetails(customer)} />
                {canWriteCustomers ? (
                  customer.isActive ? (
                    <IconButton action="delete" label="انتقال به آرشیو" tooltip="انتقال به آرشیو" onClick={() => onDeleteCustomer(customer)} />
                  ) : (
                    <IconButton action="restore" label="بازیابی مشتری" tooltip="بازیابی مشتری" onClick={() => onRestoreCustomer(customer)} />
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
