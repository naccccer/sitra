import { useState } from 'react'
import { ModalShell, Button } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { usePostableAccounts } from '../../hooks/useAccounts'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { accountingApi } from '../../services/accountingApi'

function newLine() {
  return { accountId: '', description: '', debitAmount: '', creditAmount: '' }
}

export function VoucherFormModal({ voucher, session, onClose, onSaved }) {
  const isEdit = Boolean(voucher)
  const { accounts: postableAccounts } = usePostableAccounts()
  const { fiscalYears, currentDefault } = useFiscalYears()

  const [fiscalYearId, setFiscalYearId] = useState(
    voucher?.fiscalYearId ?? currentDefault?.id ?? ''
  )
  const [voucherDate, setVoucherDate] = useState(
    voucher?.voucherDate ?? new Date().toISOString().slice(0, 10)
  )
  const [description, setDescription] = useState(voucher?.description ?? '')
  const [lines, setLines] = useState(
    voucher?.lines?.length
      ? voucher.lines.map((l) => ({
          accountId: l.accountId ?? '',
          description: l.description ?? '',
          debitAmount: l.debitAmount > 0 ? String(l.debitAmount) : '',
          creditAmount: l.creditAmount > 0 ? String(l.creditAmount) : '',
        }))
      : [newLine(), newLine()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const setLine = (idx, patch) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const debitTotal = lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0)
  const creditTotal = lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0)
  const isBalanced = debitTotal > 0 && debitTotal === creditTotal

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const normalizedLines = lines.map((l) => ({
      accountId: l.accountId,
      description: l.description,
      debitAmount: Number(l.debitAmount) || 0,
      creditAmount: Number(l.creditAmount) || 0,
    }))
    try {
      if (isEdit) {
        await accountingApi.updateVoucher({
          id: voucher.id,
          description,
          voucherDate,
          lines: normalizedLines,
        })
      } else {
        await accountingApi.createVoucher({
          fiscalYearId,
          voucherDate,
          description,
          lines: normalizedLines,
        })
      }
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      isOpen
      title={isEdit ? `ویرایش سند ${toPN(voucher.voucherNo)}` : 'سند حسابداری جدید'}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold">
            <span className={`ml-3 ${isBalanced ? 'text-emerald-700' : 'text-rose-600'}`}>
              بدهکار: {toPN(debitTotal.toLocaleString())} | بستانکار: {toPN(creditTotal.toLocaleString())}
              {isBalanced ? ' ✓' : ' — غیر متوازن'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>انصراف</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !isBalanced}>
              {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
            </Button>
          </div>
        </div>
      }
    >
      {error && <div className="mb-3 rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
        {!isEdit && (
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">سال مالی *</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
              value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}
            >
              <option value="">-- انتخاب سال مالی --</option>
              {fiscalYears.filter((f) => f.status === 'open').map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1">تاریخ سند *</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)}
          />
        </div>
        <div className={isEdit ? 'sm:col-span-2' : ''}>
          <label className="block text-xs font-black text-slate-700 mb-1">شرح سند</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات اختیاری..."
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-2 py-2">حساب *</th>
              <th className="px-2 py-2">شرح آرتیکل</th>
              <th className="px-2 py-2 text-left">بدهکار (ریال)</th>
              <th className="px-2 py-2 text-left">بستانکار (ریال)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="px-2 py-1.5">
                  <select
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900"
                    value={line.accountId}
                    onChange={(e) => setLine(idx, { accountId: e.target.value })}
                  >
                    <option value="">-- انتخاب حساب --</option>
                    {postableAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900"
                    value={line.description}
                    onChange={(e) => setLine(idx, { description: e.target.value })}
                    placeholder="شرح ردیف..."
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 ltr"
                    value={line.debitAmount}
                    onChange={(e) => setLine(idx, { debitAmount: e.target.value, creditAmount: e.target.value ? '' : line.creditAmount })}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 ltr"
                    value={line.creditAmount}
                    onChange={(e) => setLine(idx, { creditAmount: e.target.value, debitAmount: e.target.value ? '' : line.debitAmount })}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {lines.length > 2 && (
                    <Button size="sm" variant="danger" onClick={() => removeLine(idx)}>×</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button size="sm" variant="ghost" onClick={addLine}>+ افزودن ردیف</Button>
      </div>
    </ModalShell>
  )
}
