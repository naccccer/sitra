import { Card, EmptyState } from '@/components/shared/ui'
import { formatAmount, toPN } from '../../utils/customersView'

export const CustomerDetailsFinancialTab = ({ customer = {}, projects = [] }) => (
  <div className="mt-4 space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card tone="muted" padding="md">
        <div className="text-[11px] font-bold text-slate-500">جمع فروش</div>
        <div className="mt-1 text-xl font-black text-slate-900">{formatAmount(customer.totalAmount || 0)}</div>
      </Card>
      <Card tone="muted" padding="md">
        <div className="text-[11px] font-bold text-slate-500">پرداخت‌شده</div>
        <div className="mt-1 text-xl font-black text-emerald-700">{formatAmount(customer.paidAmount || 0)}</div>
      </Card>
      <Card tone="muted" padding="md">
        <div className="text-[11px] font-bold text-slate-500">مانده</div>
        <div className="mt-1 text-xl font-black text-rose-700">{formatAmount(customer.dueAmount || 0)}</div>
      </Card>
      <Card tone="muted" padding="md">
        <div className="text-[11px] font-bold text-slate-500">سفارش‌های فعال</div>
        <div className="mt-1 text-xl font-black text-slate-900">{toPN(customer.activeOrdersCount || 0)}</div>
      </Card>
    </div>
    <Card tone="muted" padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-900">جمع‌بندی پروژه‌ها</div>
      {projects.length === 0 ? (
        <EmptyState title="خلاصه مالی ندارد" description="برای این مشتری هنوز پروژه‌ای ثبت نشده است." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-black">پروژه</th>
                <th className="px-3 py-2 text-center font-black">سفارش</th>
                <th className="px-3 py-2 text-end font-black">جمع</th>
                <th className="px-3 py-2 text-end font-black">پرداخت</th>
                <th className="px-3 py-2 text-end font-black">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="bg-white">
                  <td className="px-3 py-2 font-black text-slate-800">{project.name}</td>
                  <td className="px-3 py-2 text-center font-black text-slate-700">{toPN(project?.financialSummary?.ordersCount || 0)}</td>
                  <td className="px-3 py-2 text-end font-black text-slate-900">{formatAmount(project?.financialSummary?.totalAmount || 0)}</td>
                  <td className="px-3 py-2 text-end font-black text-emerald-700">{formatAmount(project?.financialSummary?.paidAmount || 0)}</td>
                  <td className="px-3 py-2 text-end font-black text-rose-700">{formatAmount(project?.financialSummary?.dueAmount || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  </div>
)

