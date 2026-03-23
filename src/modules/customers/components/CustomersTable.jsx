import { Button, EmptyState } from '@/components/shared/ui'
import { formatAmount, toPN } from '../utils/customersView'

export const CustomersTable = ({
  customers = [],
  isLoading = false,
  selectedCustomerId = '',
  canWriteCustomers = false,
  onOpenDetails = () => {},
  onEditCustomer = () => {},
  onDeleteCustomer = () => {},
  onRestoreCustomer = () => {},
}) => {
  if (!isLoading && customers.length === 0) {
    return (
      <EmptyState
        title="مشتری برای نمایش وجود ندارد"
        description="فیلترها یا عبارت جستجو را تغییر دهید."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1020px] w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-[112px]" />
          <col className="w-[240px]" />
          <col className="w-[132px]" />
          <col className="w-[88px]" />
          <col className="w-[88px]" />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
          <col className="w-[200px]" />
        </colgroup>
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-2 py-3 text-center font-black">کد مشتری</th>
            <th className="px-3 py-3 text-start font-black">نام</th>
            <th className="px-3 py-3 text-start font-black">تلفن پیش‌فرض</th>
            <th className="px-3 py-3 text-center font-black">پروژه فعال</th>
            <th className="px-3 py-3 text-center font-black">سفارش فعال</th>
            <th className="px-3 py-3 text-end font-black">جمع فروش</th>
            <th className="px-3 py-3 text-end font-black">مانده</th>
            <th className="px-3 py-3 text-center font-black">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-xs font-bold text-slate-500">
                در حال بارگذاری...
              </td>
            </tr>
          ) : customers.map((customer) => (
            <tr
              key={customer.id}
              className={`transition-colors hover:bg-slate-50 ${selectedCustomerId === customer.id ? 'bg-blue-50/40' : ''}`}
            >
              <td className="px-2 py-3 text-center font-mono font-black text-slate-900" dir="ltr">{customer.customerCode || '-'}</td>
              <td className="px-3 py-3">
                <button type="button" className="text-start" onClick={() => onOpenDetails(customer)}>
                  <div className="truncate font-black text-slate-900">{customer.fullName || '-'}</div>
                  {customer.companyName ? <div className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{customer.companyName}</div> : null}
                </button>
              </td>
              <td className="px-3 py-3 font-bold text-slate-700" dir="ltr">{customer.defaultPhone || '-'}</td>
              <td className="px-3 py-3 text-center font-black text-slate-800">{toPN(customer.activeProjectsCount || 0)}</td>
              <td className="px-3 py-3 text-center font-black text-slate-800">{toPN(customer.activeOrdersCount || 0)}</td>
              <td className="px-3 py-3 text-end font-black text-slate-900">{formatAmount(customer.totalAmount || 0)}</td>
              <td className="px-3 py-3 text-end font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap justify-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => onOpenDetails(customer)}>جزئیات</Button>
                  {canWriteCustomers ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => onEditCustomer(customer)}>ویرایش</Button>
                      {customer.isActive ? (
                        <Button size="sm" variant="danger" onClick={() => onDeleteCustomer(customer)}>حذف</Button>
                      ) : (
                        <Button size="sm" variant="success" onClick={() => onRestoreCustomer(customer)}>بازیابی</Button>
                      )}
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
