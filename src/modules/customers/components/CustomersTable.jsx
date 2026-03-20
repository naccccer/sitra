import { Badge, Button, EmptyState } from '@/components/shared/ui'
import { customerTypeLabel, formatAmount, formatLocation, toPN } from '../utils/customersView'

const rowBadgeTone = (isActive) => (isActive ? 'success' : 'danger')

export const CustomersTable = ({
  customers = [],
  isLoading = false,
  selectedCustomerId = '',
  canWriteCustomers = false,
  onOpenDetails = () => {},
  onEditCustomer = () => {},
  onToggleActive = () => {},
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
      <table className="min-w-[1700px] w-full border-collapse text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-3 text-start font-black">کد مشتری</th>
            <th className="px-3 py-3 text-start font-black">نام</th>
            <th className="px-3 py-3 text-start font-black">نوع</th>
            <th className="px-3 py-3 text-start font-black">تلفن پیش‌فرض</th>
            <th className="px-3 py-3 text-start font-black">موقعیت</th>
            <th className="px-3 py-3 text-center font-black">پروژه فعال</th>
            <th className="px-3 py-3 text-center font-black">شماره فعال</th>
            <th className="px-3 py-3 text-center font-black">سفارش فعال</th>
            <th className="px-3 py-3 text-end font-black">جمع فروش</th>
            <th className="px-3 py-3 text-end font-black">پرداخت‌شده</th>
            <th className="px-3 py-3 text-end font-black">مانده</th>
            <th className="px-3 py-3 text-center font-black">وضعیت</th>
            <th className="px-3 py-3 text-center font-black">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={13} className="px-3 py-8 text-center text-xs font-bold text-slate-500">
                در حال بارگذاری...
              </td>
            </tr>
          ) : customers.map((customer) => (
            <tr
              key={customer.id}
              className={`transition-colors hover:bg-slate-50 ${selectedCustomerId === customer.id ? 'bg-blue-50/40' : ''}`}
            >
              <td className="px-3 py-3 font-mono font-black text-slate-900" dir="ltr">{customer.customerCode || '-'}</td>
              <td className="px-3 py-3">
                <button type="button" className="text-start" onClick={() => onOpenDetails(customer)}>
                  <div className="font-black text-slate-900">{customer.fullName || '-'}</div>
                  {customer.companyName ? <div className="mt-0.5 text-[11px] font-bold text-slate-500">{customer.companyName}</div> : null}
                </button>
              </td>
              <td className="px-3 py-3 text-slate-700">{customerTypeLabel(customer.customerType)}</td>
              <td className="px-3 py-3 font-bold text-slate-700" dir="ltr">{customer.defaultPhone || '-'}</td>
              <td className="px-3 py-3 font-bold text-slate-600">{formatLocation(customer.province, customer.city)}</td>
              <td className="px-3 py-3 text-center font-black text-slate-800">{toPN(customer.activeProjectsCount || 0)}</td>
              <td className="px-3 py-3 text-center font-black text-slate-800">{toPN(customer.activeContactsCount || 0)}</td>
              <td className="px-3 py-3 text-center font-black text-slate-800">{toPN(customer.activeOrdersCount || 0)}</td>
              <td className="px-3 py-3 text-end font-black text-slate-900">{formatAmount(customer.totalAmount || 0)}</td>
              <td className="px-3 py-3 text-end font-black text-emerald-700">{formatAmount(customer.paidAmount || 0)}</td>
              <td className="px-3 py-3 text-end font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</td>
              <td className="px-3 py-3 text-center">
                <Badge tone={rowBadgeTone(customer.isActive)}>{customer.isActive ? 'فعال' : 'غیرفعال'}</Badge>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap justify-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => onOpenDetails(customer)}>جزئیات</Button>
                  {canWriteCustomers ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => onEditCustomer(customer)}>ویرایش</Button>
                      <Button
                        size="sm"
                        variant={customer.isActive ? 'danger' : 'success'}
                        onClick={() => onToggleActive(customer)}
                      >
                        {customer.isActive ? 'غیرفعال' : 'فعال'}
                      </Button>
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
