import { useMemo, useState } from 'react'
import { PenLine, Printer, Trash2 } from 'lucide-react'
import { Button, Select } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { formatMoney, getPaymentMeta, getRunStatusMeta } from './payrollMath'
import { PayrollConfirmModal } from './PayrollConfirmModal'

export function PayrollReviewPanel({ canManage, onDeletePayslip, onEditPayslip, onPaperSizeChange, onPrint, onPrintMany, paperSize, run }) {
  const payslips = Array.isArray(run?.payslips) ? run.payslips : []
  const runKey = String(run?.id || 'default')
  const [pendingDeletePayslip, setPendingDeletePayslip] = useState(null)
  const [selectedByRunId, setSelectedByRunId] = useState({})
  const selectedPayslipIds = useMemo(() => selectedByRunId[runKey] || [], [runKey, selectedByRunId])
  const allSelected = payslips.length > 0 && selectedPayslipIds.length === payslips.length
  const selectedPayslips = payslips.filter((payslip) => selectedPayslipIds.includes(String(payslip.id || payslip.employeeId || '')))

  const confirmDeletePayslip = async () => {
    if (!pendingDeletePayslip) return
    const payslip = pendingDeletePayslip
    setPendingDeletePayslip(null)
    await onDeletePayslip?.(payslip)
  }

  const toggleAll = () => {
    setSelectedByRunId((current) => ({
      ...current,
      [runKey]: allSelected ? [] : payslips.map((payslip) => String(payslip.id || payslip.employeeId || '')),
    }))
  }

  const togglePayslip = (payslip) => {
    const payslipId = String(payslip.id || payslip.employeeId || '')
    setSelectedByRunId((current) => {
      const selectedIds = current[runKey] || []
      return {
        ...current,
        [runKey]: selectedIds.includes(payslipId) ? selectedIds.filter((item) => item !== payslipId) : [...selectedIds, payslipId],
      }
    })
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-3">
          {selectedPayslips.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
              {toPN(selectedPayslips.length)} فیش انتخاب شده
            </div>
          ) : null}
          <div className="w-24">
            <Select value={paperSize} onChange={(event) => onPaperSizeChange?.(String(event.target.value || 'a4'))}>
              <option value="a4">A4</option>
              <option value="a5">A5</option>
            </Select>
          </div>
          <div className="flex items-center">
            <Button size="sm" variant={selectedPayslips.length > 0 ? 'primary' : 'secondary'} disabled={selectedPayslips.length === 0} onClick={() => onPrintMany?.(selectedPayslips)} className="gap-1.5">
              <Printer className="h-4 w-4" />
              چاپ انتخاب‌شده‌ها
            </Button>
          </div>
        </div>
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50/90 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-3 py-2 text-center">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="انتخاب همه فیش‌ها" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
              </th>
              <th className="px-3 py-2">پرسنل</th>
              <th className="px-3 py-2">خالص</th>
              <th className="px-3 py-2 text-center">وضعیت پرداخت</th>
              <th className="px-3 py-2 text-center">وضعیت فیش</th>
              <th className="px-3 py-2 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payslips.map((payslip) => {
              const paymentMeta = getPaymentMeta(payslip.paymentStatus)
              const statusMeta = getRunStatusMeta(payslip.status)
              const payslipId = String(payslip.id || payslip.employeeId || '')
              const isSelected = selectedPayslipIds.includes(payslipId)
              return (
                <tr key={payslip.id || payslip.employeeId} className="transition-colors hover:bg-slate-50">
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => togglePayslip(payslip)} aria-label={`انتخاب فیش ${payslip.employeeName || payslip.employeeCode || ''}`} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-black text-slate-900">{payslip.employeeName}</div>
                    <div className="text-[11px] font-bold text-slate-500">{toPN(payslip.employeeCode || '-')}</div>
                  </td>
                  <td className="px-3 py-2 font-black text-slate-900">{formatMoney(payslip.net)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${paymentMeta.tone}`}>{paymentMeta.label}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusMeta.tone}`}>{statusMeta.label}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {canManage ? <Button size="icon" variant="ghost" onClick={() => onEditPayslip(payslip)} title="ویرایش" aria-label="ویرایش"><PenLine className="h-4 w-4" /></Button> : null}
                      {canManage && payslip.status === 'draft' ? <Button size="icon" variant="danger" onClick={() => setPendingDeletePayslip(payslip)} title="حذف" aria-label="حذف"><Trash2 className="h-4 w-4" /></Button> : null}
                      <Button size="icon" variant="secondary" onClick={() => onPrint(payslip)} title="چاپ" aria-label="چاپ"><Printer className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {payslips.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center font-bold text-slate-400">برای این دوره هنوز فیشی ثبت نشده است.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <PayrollConfirmModal
        isOpen={Boolean(pendingDeletePayslip)}
        onClose={() => setPendingDeletePayslip(null)}
        onConfirm={confirmDeletePayslip}
        title="حذف فیش پیش‌نویس"
        description="این فیش از دوره جاری حذف می‌شود."
        confirmLabel="حذف فیش"
        body={`آیا فیش پیش‌نویس ${pendingDeletePayslip?.employeeName || pendingDeletePayslip?.employeeCode || 'انتخاب‌شده'} حذف شود؟`}
        icon={Trash2}
      />
    </>
  )
}
