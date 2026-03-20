import { useEffect, useRef, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { calculatePayslipTotals, formatMaybeDate, formatMoney, getPaymentMeta, monthLabel, sumPayments } from './payrollMath'

const PRINT_ROWS = [
  ['حقوق پایه', 'baseSalary'],
  ['حق مسکن', 'housingAllowance'],
  ['بن خواربار', 'foodAllowance'],
  ['حق اولاد', 'childAllowance'],
  ['سنوات', 'seniorityAllowance'],
  ['اضافه کار', 'overtimePay'],
  ['پاداش', 'bonus'],
  ['مزایای متفرقه', 'otherAdditions'],
]

const DEDUCTION_ROWS = [
  ['بیمه', 'insurance'],
  ['مالیات', 'tax'],
  ['اقساط / وام', 'loanDeduction'],
  ['علی الحساب', 'advanceDeduction'],
  ['غیبت / کسری کار', 'absenceDeduction'],
  ['سایر کسورات', 'otherDeductions'],
]

export function PayslipPrintView({ onClose, payslip, run, settings }) {
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [printRequestId, setPrintRequestId] = useState(0)
  const handledPrintRequestIdRef = useRef(0)
  const printableRef = useRef(null)

  useEffect(() => {
    setIsPreviewReady(false)

    if (typeof window === 'undefined') {
      setIsPreviewReady(true)
      return undefined
    }

    let cancelled = false
    let firstFrameId = 0
    let secondFrameId = 0
    let timeoutId = 0

    const markReady = () => {
      if (!cancelled && printableRef.current) {
        setIsPreviewReady(true)
      }
    }

    const waitForFonts = () => {
      const fontsReady = typeof document !== 'undefined' ? document.fonts?.ready : null
      if (fontsReady && typeof fontsReady.then === 'function') {
        fontsReady.then(markReady).catch(markReady)
        return
      }
      timeoutId = window.setTimeout(markReady, 40)
    }

    if (typeof window.requestAnimationFrame === 'function') {
      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(waitForFonts)
      })
    } else {
      waitForFonts()
    }

    return () => {
      cancelled = true
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(firstFrameId)
        window.cancelAnimationFrame(secondFrameId)
      }
      window.clearTimeout(timeoutId)
    }
  }, [payslip?.id, run?.id])

  useEffect(() => {
    if (
      !isPreviewReady
      || !printableRef.current
      || printRequestId === 0
      || handledPrintRequestIdRef.current === printRequestId
      || typeof window === 'undefined'
    ) {
      return undefined
    }

    handledPrintRequestIdRef.current = printRequestId

    let cancelled = false
    let frameId = 0
    let settleFrameId = 0
    let timeoutId = 0

    const launchPrint = () => {
      if (cancelled) return
      timeoutId = window.setTimeout(() => {
        if (!cancelled && typeof window.print === 'function') {
          window.focus?.()
          window.print()
        }
      }, 80)
    }

    if (typeof window.requestAnimationFrame === 'function') {
      frameId = window.requestAnimationFrame(() => {
        settleFrameId = window.requestAnimationFrame(launchPrint)
      })
    } else {
      launchPrint()
    }

    return () => {
      cancelled = true
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId)
        window.cancelAnimationFrame(settleFrameId)
      }
      window.clearTimeout(timeoutId)
    }
  }, [isPreviewReady, printRequestId])

  if (!payslip) return null
  const totals = calculatePayslipTotals(payslip)
  const paid = sumPayments(payslip.payments)
  const paymentMeta = getPaymentMeta(payslip.paymentStatus)

  return (
    <Card padding="none" className="overflow-hidden border-slate-300">
      <div className="print-hide flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-900">پیش نمایش فیش حقوقی</div>
          <div className="text-xs font-bold text-slate-500">چیدمان A4 راست به چپ با امضای انتهای صفحه</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>بستن</Button>
          <Button size="sm" variant="primary" onClick={() => setPrintRequestId((current) => current + 1)}>چاپ فیش</Button>
        </div>
      </div>

      <div ref={printableRef} className="printable-area bg-[#f4f1ea] p-4 md:p-8" dir="rtl">
        <div className="mx-auto min-h-[1122px] max-w-[794px] bg-white px-6 py-8 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)] print:shadow-none">
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">PAYSLIP</div>
              <div className="mt-3 text-2xl font-black text-slate-900">{settings.companyName || 'سامانه حقوق و دستمزد'}</div>
              <div className="mt-2 text-sm font-bold text-slate-500">شناسه / کد کارگاهی: {settings.companyId || '-'}</div>
            </div>
            <div className="text-end">
              <div className={'inline-flex rounded-full border px-3 py-1 text-[11px] font-black ' + paymentMeta.tone}>{paymentMeta.label}</div>
              <div className="mt-4 text-xs font-bold text-slate-500">دوره</div>
              <div className="text-lg font-black text-slate-900">{run?.title || monthLabel(run?.periodKey)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Identity label="نام پرسنل" value={payslip.employeeName} />
            <Identity label="کد پرسنلی" value={payslip.employeeCode || '-'} />
            <Identity label="واحد" value={payslip.department || '-'} />
            <Identity label="تاریخ صدور" value={formatMaybeDate(run?.issuedAt || payslip.issuedAt)} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <PrintTable title="دریافتی ها" rows={PRINT_ROWS} payslip={payslip} total={totals.gross} />
            <PrintTable title="کسورات" rows={DEDUCTION_ROWS} payslip={payslip} total={totals.deductions} tone="deduction" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TotalCard label="خالص پرداختی" value={formatMoney(totals.net)} emphasize />
            <TotalCard label="پرداخت شده" value={formatMoney(paid)} />
            <TotalCard label="مانده" value={formatMoney(Math.max(totals.net - paid, 0))} />
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="text-xs font-black text-slate-500">یادداشت</div>
            <div className="mt-2 text-sm font-bold leading-7 text-slate-700">{payslip.notes || settings.footerNote || 'بدون توضیح'}</div>
          </div>

          <div className="mt-12 grid gap-8 border-t border-dashed border-slate-300 pt-8 sm:grid-cols-2">
            <div>
              <div className="text-xs font-black text-slate-500">{settings.signatureLabel || 'امضا و تایید'}</div>
              <div className="mt-16 border-t border-slate-300 pt-3 text-sm font-black text-slate-900">{settings.signatoryName || '........................'}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{settings.signatoryTitle || 'مسئول مالی / مدیریت'}</div>
            </div>
            <div className="text-sm font-bold leading-7 text-slate-600 sm:text-end">{settings.signatureNote || 'با صدور این فیش، مبالغ و کسورات ماه جاری تایید می گردد.'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Identity({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-2 text-sm font-black text-slate-900">{value}</div></div>
}

function PrintTable({ title, rows, payslip, total, tone = 'addition' }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200">
      <div className={'px-5 py-4 text-sm font-black ' + (tone === 'deduction' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900')}>{title}</div>
      <table className="w-full text-right text-sm">
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map(([label, field]) => <tr key={field}><td className="px-5 py-3 font-bold text-slate-600">{label}</td><td className="px-5 py-3 text-end font-black text-slate-900">{formatMoney(payslip?.[field])}</td></tr>)}
          <tr className="bg-slate-50"><td className="px-5 py-3 font-black text-slate-700">جمع</td><td className="px-5 py-3 text-end font-black text-slate-900">{formatMoney(total)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function TotalCard({ emphasize = false, label, value }) {
  return (
    <div className={'rounded-[24px] border px-4 py-4 ' + (emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white')}>
      <div className={'text-[11px] font-bold ' + (emphasize ? 'text-white/70' : 'text-slate-500')}>{label}</div>
      <div className="mt-2 text-lg font-black">{value}</div>
    </div>
  )
}
