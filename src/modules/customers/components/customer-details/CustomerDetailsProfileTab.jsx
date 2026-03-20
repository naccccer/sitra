import { Badge, Card } from '@/components/shared/ui'
import { formatAmount } from '../../utils/customersView'

export const CustomerDetailsProfileTab = ({ profileRows = [], customer = {} }) => (
  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
    <Card tone="muted" className="space-y-2" padding="md">
      <div className="text-sm font-black text-slate-900">خلاصه مشتری</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">وضعیت</div>
          <Badge tone={customer.isActive ? 'success' : 'danger'}>{customer.isActive ? 'فعال' : 'غیرفعال'}</Badge>
        </div>
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">تاریخ بروزرسانی</div>
          <div className="text-xs font-black text-slate-800">{customer.updatedAt || '-'}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {profileRows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2">
            <span className="text-[11px] font-bold text-slate-500">{label}</span>
            <span className="max-w-[70%] text-end text-xs font-black text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </Card>
    <Card tone="muted" className="space-y-2" padding="md">
      <div className="text-sm font-black text-slate-900">شاخص‌ها</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">پروژه فعال</div>
          <div className="text-lg font-black text-slate-900">{customer.activeProjectsCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">شماره فعال</div>
          <div className="text-lg font-black text-slate-900">{customer.activeContactsCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">سفارش فعال</div>
          <div className="text-lg font-black text-slate-900">{customer.activeOrdersCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-3">
          <div className="text-[11px] font-bold text-slate-500">مانده</div>
          <div className="text-lg font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</div>
        </div>
      </div>
    </Card>
  </div>
)
