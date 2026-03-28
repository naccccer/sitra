import { useMemo } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { calculatePayslipTotals, formatMaybeDate, formatMoney, monthLabel } from './payrollMath'
import { calculateCatalogTotals, resolveCatalogDisplayValue, splitCatalogByType } from './payrollCatalog'

export function PayslipPrintView({ catalog = [], onClose, payslip, run, settings }) {
  const groupedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])
  if (!payslip) return null

  const fallback = calculatePayslipTotals(payslip)
  const catalogTotals = calculateCatalogTotals(payslip, catalog)
  const totals = catalogTotals.gross || catalogTotals.deductions ? catalogTotals : fallback
  const employeeInitial = String(payslip.employeeName || 'ف').trim().slice(0, 1)

  return (
    <Card padding="none" className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="print-hide flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black tracking-[0.35em] text-white shadow-lg shadow-slate-950/15">
            PAY
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">پیش‌نمایش فیش حقوقی</div>
            <div className="text-xs font-bold text-slate-500">چیدمان A4 راست‌به‌چپ برای چاپ و بایگانی</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>بستن</Button>
          <Button size="sm" variant="primary" onClick={() => window.print()}>چاپ فیش</Button>
        </div>
      </div>

      <div className="printable-area bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#f3f4f6_100%)] p-2 md:p-4" dir="rtl">
        <div className="mx-auto w-full max-w-[1120px] rounded-[32px] border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.10)] print:shadow-none md:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.95fr]">
            <div className="rounded-[28px] bg-slate-950 px-4 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.45em] text-white/55">PAYSLIP</div>
                  <div className="mt-1 text-xl font-black leading-tight">{settings.companyName || 'سامانه حقوق و دستمزد'}</div>
                  <div className="mt-1 text-xs font-bold text-white/70">شناسه / کد کارگاهی: {settings.companyId || '-'}</div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-black text-white ring-1 ring-white/10">
                  {employeeInitial}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MiniStat label="کارمند" value={payslip.employeeName || '-'} />
                <MiniStat label="کد پرسنلی" value={payslip.employeeCode || '-'} />
                <MiniStat label="واحد" value={payslip.department || '-'} />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">ISSUED</div>
                  <div className="mt-1 text-base font-black text-slate-900">{run?.title || monthLabel(run?.periodKey)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">تاریخ صدور: {formatMaybeDate(run?.issuedAt || payslip.issuedAt)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-end">
                  <div className="text-[10px] font-bold text-slate-500">خالص پرداختی</div>
                  <div className="mt-1 text-base font-black text-slate-950">{formatMoney(totals.net)}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <SoftStat label="جمع دریافتی" value={formatMoney(totals.gross)} />
                <SoftStat label="جمع کسورات" value={formatMoney(totals.deductions)} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Identity label="نام پرسنل" value={payslip.employeeName || '-'} />
            <Identity label="کد پرسنلی" value={payslip.employeeCode || '-'} />
            <Identity label="واحد" value={payslip.department || '-'} />
            <Identity label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <RowsSection title="کارکرد و اطلاعات" catalog={catalog} rows={[...groupedCatalog.info, ...groupedCatalog.work]} payslip={payslip} tone="neutral" />
            <RowsSection title="دریافتی‌ها" catalog={catalog} rows={groupedCatalog.earning} payslip={payslip} total={totals.gross} tone="earnings" />
            <RowsSection title="کسورات" catalog={catalog} rows={groupedCatalog.deduction} payslip={payslip} total={totals.deductions} tone="deductions" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <TotalCard label="جمع دریافتی" value={formatMoney(totals.gross)} />
            <TotalCard label="جمع کسورات" value={formatMoney(totals.deductions)} />
            <TotalCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
          </div>

          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/80 px-4 py-4">
            <div className="text-xs font-black text-amber-700">یادداشت</div>
            <div className="mt-1 text-xs font-bold leading-6 text-slate-700">{payslip.notes || settings.footerNote || 'بدون توضیح'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function RowsSection({ catalog = [], payslip, rows = [], title, tone = 'neutral', total = null }) {
  if (!rows.length) return null

  const shellClass =
    tone === 'deductions'
      ? 'border-rose-200 bg-rose-50/50'
      : tone === 'earnings'
        ? 'border-emerald-200 bg-emerald-50/50'
        : 'border-slate-200 bg-slate-50/50'

  const headClass =
    tone === 'deductions'
      ? 'bg-rose-950 text-white'
      : tone === 'earnings'
        ? 'bg-emerald-950 text-white'
        : 'bg-slate-950 text-white'

  return (
    <div className={`overflow-hidden rounded-[24px] border ${shellClass}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-black ${headClass}`}>
        <div>{title}</div>
        <div className="text-[11px] font-bold text-white/70">{rows.length} آیتم</div>
      </div>
      <table className="w-full text-right text-xs md:text-sm">
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((item) => (
            <tr key={item.key} className="odd:bg-slate-50/40">
              <td className="px-4 py-3 font-bold text-slate-600">{item.label}</td>
              <td className="px-4 py-3 text-end font-black text-slate-900">{formatMoney(resolveCatalogDisplayValue(payslip, catalog, item))}</td>
            </tr>
          ))}
          {total !== null && (
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-black text-slate-700">جمع</td>
              <td className="px-4 py-3 text-end font-black text-slate-900">{formatMoney(total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Identity({ emphasize = false, label, value }) {
  return (
    <div className={`rounded-[22px] border px-3 py-3 ${emphasize ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white'}`}>
      <div className={`text-[10px] font-bold ${emphasize ? 'text-white/60' : 'text-slate-500'}`}>{label}</div>
      <div className={`mt-1 text-xs font-black md:text-sm ${emphasize ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

function TotalCard({ emphasize = false, label, value }) {
  return (
    <div className={`rounded-[24px] border px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] ${emphasize ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white'}`}>
      <div className={`text-[10px] font-bold ${emphasize ? 'text-white/60' : 'text-slate-500'}`}>{label}</div>
      <div className="mt-1 text-lg font-black md:text-xl">{value}</div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
      <div className="text-[10px] font-bold text-white/60">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}

function SoftStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  )
}
