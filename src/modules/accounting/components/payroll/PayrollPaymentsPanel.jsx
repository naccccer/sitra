import { useMemo, useState } from 'react'
import { Button, Card, Input, Select } from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { todayGregorian } from '../../utils/dateUtils.js'
import { ShamsiDateInput } from '../DatePickerWrapper'
import { formatMaybeDate, formatMoney, getPaymentMeta, sumPayments } from './payrollMath'

function createEmptyPayment() {
  return {
    amount: '',
    paymentDate: todayGregorian(),
    paymentMethod: 'bank',
    referenceNo: '',
    notes: '',
    accountId: '',
  }
}

export function PayrollPaymentsPanel({ busy, canManage, onRecordPayment, payslip }) {
  const paid = useMemo(() => sumPayments(payslip?.payments), [payslip])
  const balance = Math.max((payslip?.net || 0) - paid, 0)
  const paymentMeta = getPaymentMeta(payslip?.paymentStatus || 'unpaid')

  if (!payslip) {
    return <Card padding="md" className="text-sm font-bold text-slate-400">برای ثبت پرداخت، ابتدا یک فیش را از لیست دوره ها انتخاب و ویرایش کنید.</Card>
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-black text-slate-900">ثبت و پیگیری پرداخت</div>
          <div className="text-xs font-bold text-slate-500">{payslip.employeeName} - {payslip.employeeCode || '-'}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${paymentMeta.tone}`}>{paymentMeta.label}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="خالص فیش" value={formatMoney(payslip.net)} />
        <Metric label="پرداخت شده" value={formatMoney(paid)} />
        <Metric label="مانده" value={formatMoney(balance)} emphasize />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-3 py-2">تاریخ</th>
              <th className="px-3 py-2">روش</th>
              <th className="px-3 py-2">مبلغ</th>
              <th className="px-3 py-2">مرجع</th>
              <th className="px-3 py-2">توضیح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {(payslip.payments || []).map((payment, index) => (
              <tr key={`${payment.paymentDate || 'p'}:${index}`}>
                <td className="px-3 py-2 font-bold text-slate-600">{formatMaybeDate(payment.paymentDate)}</td>
                <td className="px-3 py-2 text-slate-600">{payment.paymentMethod || '-'}</td>
                <td className="px-3 py-2 font-black text-slate-900">{formatMoney(payment.amount)}</td>
                <td className="px-3 py-2 text-slate-500">{payment.referenceNo || '-'}</td>
                <td className="px-3 py-2 text-slate-500">{payment.notes || '-'}</td>
              </tr>
            ))}
            {(payslip.payments || []).length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center font-bold text-slate-400">پرداختی برای این فیش ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>

      <PayrollPaymentForm
        key={payslip.id}
        busy={busy}
        canManage={canManage}
        payslipId={payslip.id}
        onRecordPayment={onRecordPayment}
      />
    </Card>
  )
}

function Metric({ emphasize = false, label, value }) {
  return <div className={`rounded-2xl border px-3 py-3 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'}`}><div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>
}

function PayrollPaymentForm({ busy, canManage, onRecordPayment, payslipId }) {
  const [draft, setDraft] = useState(() => createEmptyPayment())

  const submit = async (event) => {
    event.preventDefault()
    await onRecordPayment(payslipId, {
      amount: Number(draft.amount || 0),
      paymentDate: draft.paymentDate,
      paymentMethod: draft.paymentMethod,
      referenceNo: draft.referenceNo,
      notes: draft.notes,
      accountId: draft.accountId || null,
    })
    setDraft(createEmptyPayment())
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto]">
      <div className="h-10 rounded-lg border border-slate-200 bg-white px-1">
        <PriceInput value={draft.amount} onChange={(value) => setDraft((current) => ({ ...current, amount: value }))} placeholder="مبلغ پرداخت" className="text-slate-800" />
      </div>
      <ShamsiDateInput
        value={draft.paymentDate}
        onChange={(paymentDate) => setDraft((current) => ({ ...current, paymentDate }))}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 cursor-pointer"
        placeholder="تاریخ پرداخت"
      />
      <Select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}>
        <option value="bank">بانکی</option>
        <option value="cash">نقدی</option>
      </Select>
      <Input value={draft.referenceNo} onChange={(event) => setDraft((current) => ({ ...current, referenceNo: event.target.value }))} placeholder="کد رهگیری" />
      <Input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="توضیحات" />
      <Button type="submit" size="sm" variant="primary" disabled={!canManage || busy}>{busy ? 'در حال ثبت...' : 'ثبت پرداخت'}</Button>
    </form>
  )
}


