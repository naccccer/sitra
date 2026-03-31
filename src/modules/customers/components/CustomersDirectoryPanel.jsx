import { Archive, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  FilterToolbar,
  Input,
  LoadingState,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
  WorkspaceCard,
} from '@/components/shared/ui';
import { formatAmount, PAGE_SIZE_OPTIONS, toPN } from '../utils/customersView';

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
  <WorkspaceCard
    title="دایرکتوری مشتریان"
    description="مدیریت متمرکز مشتریان، وضعیت سفارش‌ها و دسترسی سریع به جزئیات و بایگانی."
    className="motion-enter space-y-4"
    padding="md"
    surface="default"
    bodyClassName="space-y-4"
  >
    <FilterToolbar
      className="!p-0"
      surface="quiet"
      actions={(
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant={archiveMode ? 'secondary' : 'ghost'}
            onClick={onArchiveModeToggle}
            title={archiveMode ? 'بازگشت به لیست اصلی' : 'آرشیو'}
            iconOnly
          >
            <Archive />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onReload}
            disabled={loading}
            title="بازخوانی"
            iconOnly
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="جست‌وجو..."
            surface="quiet"
            className="!w-48"
          />
        </div>
      )}
    >
      <div className="flex items-center gap-1.5" dir="rtl">
        {canWriteCustomers && !archiveMode ? (
          <Button size="sm" variant="success" onClick={onCreateCustomer}>
            + مشتری جدید
          </Button>
        ) : null}
      </div>
    </FilterToolbar>

    {loading ? (
      <LoadingState
        title="در حال بارگذاری مشتریان"
        description="فهرست مشتریان در حال بازخوانی است."
        surface="quiet"
      />
    ) : customers.length === 0 ? (
      <EmptyState
        title={archiveMode ? 'مشتری آرشیوشده‌ای وجود ندارد' : 'مشتری برای نمایش وجود ندارد'}
        description={archiveMode ? 'اگر رکوردی آرشیو شود، از این مسیر قابل بازیابی خواهد بود.' : 'جست‌وجو را تغییر بدهید یا یک مشتری جدید ثبت کنید.'}
        className="border border-dashed border-[rgba(var(--ui-border),0.8)]"
        action={canWriteCustomers && !archiveMode ? <Button variant="success" onClick={onCreateCustomer}>ثبت مشتری</Button> : null}
      />
    ) : (
      <>
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>کد مشتری</TableHeaderCell>
                <TableHeaderCell align="start">نام</TableHeaderCell>
                <TableHeaderCell>تلفن پیش‌فرض</TableHeaderCell>
                <TableHeaderCell>سفارش فعال</TableHeaderCell>
                <TableHeaderCell>جمع فروش</TableHeaderCell>
                <TableHeaderCell>مانده</TableHeaderCell>
                <TableHeaderCell>عملیات</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  interactive
                  selected={selectedCustomerId === customer.id}
                >
                  <TableCell className="font-mono font-black" numeric dir="ltr">
                    {customer.customerCode || '-'}
                  </TableCell>
                  <TableCell align="start">
                    <button type="button" className="block w-full text-start" onClick={() => onOpenDetails(customer)}>
                      <div className="truncate font-black text-[rgb(var(--ui-text))]">{customer.fullName || '-'}</div>
                      {customer.companyName ? <div className="mt-0.5 truncate text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{customer.companyName}</div> : null}
                    </button>
                  </TableCell>
                  <TableCell tone="muted" dir="ltr">
                    <span className="inline-flex justify-center whitespace-nowrap">{customer.defaultPhone || '-'}</span>
                  </TableCell>
                  <TableCell className="font-black">{toPN(customer.activeOrdersCount || 0)}</TableCell>
                  <TableCell className="font-black">{formatAmount(customer.totalAmount || 0)}</TableCell>
                  <TableCell tone="danger" className="font-black">{formatAmount(customer.dueAmount || 0)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onOpenDetails(customer)} title="جزئیات / ویرایش" iconOnly>
                        <Pencil />
                      </Button>
                      {canWriteCustomers ? (
                        customer.isActive ? (
                          <Button size="icon" variant="danger" onClick={() => onDeleteCustomer(customer)} title="انتقال به آرشیو" iconOnly>
                            <Trash2 />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => onRestoreCustomer(customer)} title="بازیابی" iconOnly>
                            <RotateCcw />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>

        <div className="surface-card-quiet motion-enter-soft flex flex-col gap-2 rounded-[var(--radius-xl)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">
            صفحه {toPN(page)} از {toPN(totalPages)} - {toPN(totalCount)} نتیجه
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">تعداد ردیف:</span>
              <Select
                className="min-w-[110px]"
                density="compact"
                surface="quiet"
                value={String(pageSize)}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{toPN(option)} ردیف</option>)}
              </Select>
            </div>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>قبلی</Button>
            <span className="rounded-[var(--radius-md)] bg-[rgba(var(--ui-surface-elevated),0.96)] px-3 py-2 text-xs font-black text-[rgb(var(--ui-text))]">{toPN(page)}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>بعدی</Button>
          </div>
        </div>
      </>
    )}
  </WorkspaceCard>
);
