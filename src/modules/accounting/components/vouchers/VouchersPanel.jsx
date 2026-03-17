import { useState } from 'react'
import { Button, Card, EmptyState } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { useVouchers } from '../../hooks/useVouchers'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { VoucherFormModal } from './VoucherFormModal'
import { accountingApi } from '../../services/accountingApi'

const STATUS_LABELS = { draft: 'پیش‌نویس', posted: 'ثبت‌شده', cancelled: 'ابطال' }
const STATUS_COLORS = {
  draft: 'bg-amber-50 text-amber-700',
  posted: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

function fmtAmount(val) {
  return toPN(Number(val).toLocaleString())
}

export function VouchersPanel({ session }) {
  const permissions = session?.permissions ?? []
  const canWrite = permissions.includes('accounting.vouchers.write')
  const canPost = permissions.includes('accounting.vouchers.post')

  const { currentDefault } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const filters = {
    ...(fiscalYearId ? { fiscalYearId } : currentDefault ? { fiscalYearId: currentDefault.id } : {}),
    ...(status ? { status } : {}),
    page,
    pageSize: 20,
  }

  const { vouchers, total, totalPages, loading, error, reload } = useVouchers(filters)

  const handlePost = async (v) => {
    if (!window.confirm(`سند ${v.voucherNo} را نهایی می‌کنید؟ این عمل غیرقابل بازگشت است.`)) return
    try {
      await accountingApi.patchVoucher({ id: v.id, action: 'post' })
      reload()
    } catch (e) { alert(e.message) }
  }

  const handleCancel = async (v) => {
    if (!window.confirm(`سند ${v.voucherNo} را ابطال می‌کنید؟`)) return
    try {
      await accountingApi.patchVoucher({ id: v.id, action: 'cancel' })
      reload()
    } catch (e) { alert(e.message) }
  }

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 focus:outline-none"
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="posted">ثبت‌شده</option>
          <option value="cancelled">ابطال</option>
        </select>
        <div className="flex-1" />
        {canWrite && (
          <Button size="sm" variant="primary" onClick={() => setCreateModal(true)}>
            + سند جدید
          </Button>
        )}
      </div>

      {error && <div className="p-4 text-xs font-bold text-rose-600">خطا: {error}</div>}
      {loading && <div className="p-4 text-xs font-bold text-slate-500">در حال بارگذاری...</div>}

      {!loading && vouchers.length === 0 && <EmptyState message="سندی یافت نشد." />}

      {!loading && vouchers.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="px-3 py-2">شماره</th>
                  <th className="px-3 py-2">تاریخ</th>
                  <th className="px-3 py-2">شرح</th>
                  <th className="px-3 py-2">مبلغ بدهکار</th>
                  <th className="px-3 py-2">منبع</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v) => {
                  const debitTotal = v.lines?.reduce((s, l) => s + l.debitAmount, 0) ?? 0
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-black text-slate-900">{toPN(v.voucherNo)}</td>
                      <td className="px-3 py-2 font-bold text-slate-600 tabular-nums">{v.voucherDate}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-slate-700">{v.description || '-'}</td>
                      <td className="px-3 py-2 font-black tabular-nums text-slate-900">{fmtAmount(debitTotal)}</td>
                      <td className="px-3 py-2 text-slate-500">{v.sourceCode ?? v.sourceType ?? '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[v.status]}`}>
                          {STATUS_LABELS[v.status] ?? v.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {canWrite && v.status === 'draft' && (
                            <Button size="sm" variant="ghost" onClick={() => setEditTarget(v)}>ویرایش</Button>
                          )}
                          {canPost && v.status === 'draft' && (
                            <Button size="sm" variant="success" onClick={() => handlePost(v)}>ثبت</Button>
                          )}
                          {canWrite && v.status !== 'cancelled' && (
                            <Button size="sm" variant="danger" onClick={() => handleCancel(v)}>ابطال</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
              <span className="text-xs font-bold text-slate-500">
                {toPN(total)} سند | صفحه {toPN(page)} از {toPN(totalPages)}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</Button>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
              </div>
            </div>
          )}
        </>
      )}

      {createModal && (
        <VoucherFormModal
          session={session}
          onClose={() => setCreateModal(false)}
          onSaved={() => { setCreateModal(false); reload() }}
        />
      )}
      {editTarget && (
        <VoucherFormModal
          session={session}
          voucher={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); reload() }}
        />
      )}
    </Card>
  )
}
