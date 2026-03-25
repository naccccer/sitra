import { Archive, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Select } from '@/components/shared/ui'
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
  <Card padding="md" className="space-y-4">
    <div className="flex items-center justify-between gap-3" dir="rtl">
      <div className="flex items-center gap-1.5">
        {canWriteCustomers && !archiveMode ? (
          <Button size="sm" variant="success" onClick={onCreateCustomer}>
            + مشتری جدید
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant={archiveMode ? 'secondary' : 'ghost'}
          onClick={onArchiveModeToggle}
          title={archiveMode ? 'بازگشت به لیست اصلی' : 'آرشیو'}
        >
          <Archive className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onReload}
          disabled={loading}
          title="بازخوانی"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="جست‌وجو..."
          className="!w-48"
        />
      </div>
    </div>

    {loading ? (
      <EmptyState
        title="در حال بارگذاری مشتریان"
        description="فهرست مشتریان در حال بازخوانی است."
        className="border border-dashed border-slate-200"
      />
    ) : customers.length === 0 ? (
      <EmptyState
        title={archiveMode ? 'مشتری آرشیوشده‌ای وجود ندارد' : 'مشتری برای نمایش وجود ندارد'}
        description={archiveMode ? 'اگر رکوردی آرشیو شود، از این مسیر قابل بازیابی خواهد بود.' : 'جست‌وجو را تغییر بدهید یا یک مشتری جدید ثبت کنید.'}
        className="border border-dashed border-slate-200"
        action={canWriteCustomers && !archiveMode ? <Button variant="success" onClick={onCreateCustomer}>ثبت مشتری</Button> : null}
      />
    ) : (
      <>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2.5">کد مشتری</th>
                <th className="px-3 py-2.5 text-start">نام</th>
                <th className="px-3 py-2.5 text-start">تلفن پیش‌فرض</th>
                <th className="px-3 py-2.5">پروژه فعال</th>
                <th className="px-3 py-2.5">سفارش فعال</th>
                <th className="px-3 py-2.5 text-end">جمع فروش</th>
                <th className="px-3 py-2.5 text-end">مانده</th>
                <th className="px-3 py-2.5">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`hover:bg-slate-50/70 transition-colors ${selectedCustomerId === customer.id ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="px-3 py-2.5 font-mono font-black text-slate-900" dir="ltr">{customer.customerCode || '-'}</td>
                  <td className="px-3 py-2.5 text-start">
                    <button type="button" className="text-start" onClick={() => onOpenDetails(customer)}>
                      <div className="truncate font-black text-slate-900">{customer.fullName || '-'}</div>
                      {customer.companyName ? <div className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{customer.companyName}</div> : null}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-start font-bold text-slate-700" dir="ltr">{customer.defaultPhone || '-'}</td>
                  <td className="px-3 py-2.5 font-black text-slate-800">{toPN(customer.activeProjectsCount || 0)}</td>
                  <td className="px-3 py-2.5 font-black text-slate-800">{toPN(customer.activeOrdersCount || 0)}</td>
                  <td className="px-3 py-2.5 text-end font-black text-slate-900">{formatAmount(customer.totalAmount || 0)}</td>
                  <td className="px-3 py-2.5 text-end font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onOpenDetails(customer)} title="جزئیات / ویرایش">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canWriteCustomers ? (
                        customer.isActive ? (
                          <Button size="icon" variant="danger" onClick={() => onDeleteCustomer(customer)} title="انتقال به آرشیو">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => onRestoreCustomer(customer)} title="بازیابی">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            صفحه {toPN(page)} از {toPN(totalPages)} - {toPN(totalCount)} نتیجه
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500">تعداد ردیف:</span>
              <Select
                className="h-8 min-w-[110px] text-[11px]"
                value={String(pageSize)}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{toPN(option)} ردیف</option>)}
              </Select>
            </div>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>قبلی</Button>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">{toPN(page)}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>بعدی</Button>
          </div>
        </div>
      </>
    )}
  </Card>
)
