import { useMemo } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { calculatePayslipTotals, formatMaybeDate, formatMoney, monthLabel } from './payrollMath'
import { calculateCatalogTotals, resolveInputValueFromPayslip, splitCatalogByType } from './payrollCatalog'

export function PayslipPrintView({ catalog = [], onClose, payslip, run, settings }) {
  const groupedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])
  if (!payslip) return null
  const fallback = calculatePayslipTotals(payslip)
  const catalogTotals = calculateCatalogTotals(payslip, catalog)
  const totals = catalogTotals.gross || catalogTotals.deductions ? catalogTotals : fallback

  return (
    <Card padding="none" className="overflow-hidden border-slate-300">
      <div className="print-hide flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-900">پیش نمایش فیش حقوقی</div>
          <div className="text-xs font-bold text-slate-500">چیدمان A4 راست به چپ</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>بستن</Button>
          <Button size="sm" variant="primary" onClick={() => window.print()}>چاپ فیش</Button>
        </div>
      </div>

      <div className="printable-area bg-[#f4f1ea] p-4 md:p-8" dir="rtl">
        <div className="mx-auto min-h-[1122px] max-w-[794px] bg-white px-6 py-8 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)] print:shadow-none">
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">PAYSLIP</div>
              <div className="mt-3 text-2xl font-black text-slate-900">{settings.companyName || 'سامانه حقوق و دستمزد'}</div>
              <div className="mt-2 text-sm font-bold text-slate-500">شناسه / کد کارگاهی: {settings.companyId || '-'}</div>
            </div>
            <div className="text-end">
              <div className="mt-4 text-xs font-bold text-slate-500">دوره</div>
              <div className="text-lg font-black text-slate-900">{run?.title || monthLabel(run?.periodKey)}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">تاریخ صدور: {formatMaybeDate(run?.issuedAt || payslip.issuedAt)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Identity label="نام پرسنل" value={payslip.employeeName} />
            <Identity label="کد پرسنلی" value={payslip.employeeCode || '-'} />
            <Identity label="واحد" value={payslip.department || '-'} />
            <Identity label="خالص پرداختی" value={formatMoney(totals.net)} />
          </div>

          <RowsSection title="کارکرد و اطلاعات" rows={[...groupedCatalog.info, ...groupedCatalog.work]} payslip={payslip} />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <RowsSection title="دریافتی‌ها" rows={groupedCatalog.earning} payslip={payslip} total={totals.gross} />
            <RowsSection title="کسورات" rows={groupedCatalog.deduction} payslip={payslip} total={totals.deductions} dark />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TotalCard label="جمع دریافتی" value={formatMoney(totals.gross)} />
            <TotalCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
            <TotalCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="text-xs font-black text-slate-500">یادداشت</div>
            <div className="mt-2 text-sm font-bold leading-7 text-slate-700">{payslip.notes || settings.footerNote || 'بدون توضیح'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function RowsSection({ dark = false, payslip, rows = [], title, total = null }) {
  if (!rows.length) return null
  return (
    <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200">
      <div className={`px-5 py-4 text-sm font-black ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>{title}</div>
      <table className="w-full text-right text-sm">
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((item) => (
            <tr key={item.key}>
              <td className="px-5 py-3 font-bold text-slate-600">{item.label}</td>
              <td className="px-5 py-3 text-end font-black text-slate-900">{formatMoney(resolveInputValueFromPayslip(payslip, item))}</td>
            </tr>
          ))}
          {total !== null && <tr className="bg-slate-50"><td className="px-5 py-3 font-black text-slate-700">جمع</td><td className="px-5 py-3 text-end font-black text-slate-900">{formatMoney(total)}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Identity({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-2 text-sm font-black text-slate-900">{value}</div></div>
}

function TotalCard({ emphasize = false, label, value }) {
  return <div className={`rounded-[24px] border px-4 py-4 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}><div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-2 text-lg font-black">{value}</div></div>
}
