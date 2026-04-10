import { useState } from 'react'
import {
  Button,
  ConfirmDialog,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  InlineAlert,
  PaginationBar,
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { toShamsiDisplay } from '../../utils/dateUtils'
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
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const filters = {
    ...(currentDefault ? { fiscalYearId: currentDefault.id } : {}),
    ...(status ? { status } : {}),
    page,
    pageSize: 20,
  }

  const { vouchers, total, totalPages, loading, error, reload } = useVouchers(filters)

  const handlePost = async (v) => {
    try {
      await accountingApi.patchVoucher({ id: v.id, action: 'post' })
      setConfirmAction(null)
      reload()
    } catch (e) { alert(e.message) }
  }

  const handleCancel = async (v) => {
    try {
      await accountingApi.patchVoucher({ id: v.id, action: 'cancel' })
      setConfirmAction(null)
      reload()
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری اسناد">{error}</InlineAlert> : null}

      <DataTable
        minWidthClass="min-w-[980px]"
        toolbar={(
          <WorkspaceToolbar
            embedded
            actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={() => setCreateModal(true)}>سند جدید</Button> : null}
          >
            <FilterRow>
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                size="sm"
                className="sm:w-44"
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="draft">پیش‌نویس</option>
                <option value="posted">ثبت‌شده</option>
                <option value="cancelled">ابطال</option>
              </Select>
            </FilterRow>
          </WorkspaceToolbar>
        )}
        footer={vouchers.length > 0 ? (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={20}
            pageSizeOptions={[20]}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        ) : null}
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell align="center">شماره</DataTableHeaderCell>
            <DataTableHeaderCell align="center">تاریخ</DataTableHeaderCell>
            <DataTableHeaderCell>شرح</DataTableHeaderCell>
            <DataTableHeaderCell align="center">مبلغ بدهکار</DataTableHeaderCell>
            <DataTableHeaderCell>منبع</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={7} state="loading" title="در حال بارگذاری اسناد" />
          ) : vouchers.length === 0 ? (
            <DataTableState colSpan={7} title="سندی یافت نشد." />
          ) : vouchers.map((v) => {
            const debitTotal = v.lines?.reduce((s, l) => s + l.debitAmount, 0) ?? 0
            return (
              <DataTableRow key={v.id}>
                <DataTableCell align="center" tone="emphasis" className="tabular-nums">{toPN(v.voucherNo)}</DataTableCell>
                <DataTableCell align="center" className="tabular-nums text-[rgb(var(--ui-text-muted))]">{toShamsiDisplay(v.voucherDate)}</DataTableCell>
                <DataTableCell className="max-w-[220px] truncate">{v.description || '-'}</DataTableCell>
                <DataTableCell align="center" tone="emphasis" className="tabular-nums">{fmtAmount(debitTotal)}</DataTableCell>
                <DataTableCell className="text-[rgb(var(--ui-text-muted))]">{v.sourceCode ?? v.sourceType ?? '-'}</DataTableCell>
                <DataTableCell align="center">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${STATUS_COLORS[v.status]}`}>
                    {STATUS_LABELS[v.status] ?? v.status}
                  </span>
                </DataTableCell>
                <DataTableCell align="center">
                  <DataTableActions>
                    {canWrite && v.status === 'draft' ? (
                      <Button size="xs" variant="ghost" surface="table" onClick={() => setEditTarget(v)}>ویرایش</Button>
                    ) : null}
                    {canPost && v.status === 'draft' ? (
                      <Button size="xs" variant="success" surface="table" onClick={() => setConfirmAction({ type: 'post', voucher: v })}>ثبت</Button>
                    ) : null}
                    {canWrite && v.status !== 'cancelled' ? (
                      <Button size="xs" variant="danger" surface="table" onClick={() => setConfirmAction({ type: 'cancel', voucher: v })}>ابطال</Button>
                    ) : null}
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>

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
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.type === 'post' ? 'ثبت نهایی سند' : 'ابطال سند'}
        description={confirmAction?.type === 'post'
          ? `سند ${confirmAction?.voucher?.voucherNo || ''} نهایی شود؟ این عمل غیرقابل بازگشت است.`
          : `سند ${confirmAction?.voucher?.voucherNo || ''} باطل شود؟`}
        confirmLabel={confirmAction?.type === 'post' ? 'ثبت نهایی' : 'ابطال سند'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction?.voucher) return
          if (confirmAction.type === 'post') void handlePost(confirmAction.voucher)
          if (confirmAction.type === 'cancel') void handleCancel(confirmAction.voucher)
        }}
      />
    </div>
  )
}
