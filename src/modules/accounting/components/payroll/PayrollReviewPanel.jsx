import { Button, Card } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { formatMoney, getPaymentMeta, getRunStatusMeta } from './payrollMath'

export function PayrollReviewPanel({ canManage, onEditPayslip, onPrint, run }) {
  const payslips = Array.isArray(run?.payslips) ? run.payslips : []

  return (
    <Card padding="md" className="space-y-3">
      <div>
        <div className="text-sm font-black text-slate-900">مرحله ۲: ورود و بازبینی اطلاعات فیش</div>
        <div className="text-xs font-bold text-slate-500">اکسل مسیر اصلی است؛ در صورت نیاز از ویرایش دستی برای اصلاح موردی استفاده کنید.</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-3 py-2">پرسنل</th>
              <th className="px-3 py-2">خالص</th>
              <th className="px-3 py-2">وضعیت پرداخت</th>
              <th className="px-3 py-2">وضعیت فیش</th>
              <th className="px-3 py-2">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payslips.map((payslip) => {
              const paymentMeta = getPaymentMeta(payslip.paymentStatus)
              const statusMeta = getRunStatusMeta(payslip.status)
              return (
                <tr key={payslip.id || payslip.employeeId} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-black text-slate-900">{payslip.employeeName}</div>
                    <div className="text-[11px] font-bold text-slate-500">{toPN(payslip.employeeCode || '-')}</div>
                  </td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(payslip.net)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${paymentMeta.tone}`}>{paymentMeta.label}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusMeta.tone}`}>{statusMeta.label}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {canManage && <Button size="sm" variant="ghost" onClick={() => onEditPayslip(payslip)}>ویرایش</Button>}
                      <Button size="sm" variant="ghost" onClick={() => onPrint(payslip)}>چاپ</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {payslips.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center font-bold text-slate-400">برای این دوره هنوز فیشی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
