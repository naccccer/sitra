import { useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  InlineAlert,
  Input,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { useAccounts } from '../../hooks/useAccounts'
import { AccountFormModal } from './AccountFormModal'
import { accountingApi } from '../../services/accountingApi'

const TYPE_LABELS = {
  asset: 'دارایی',
  liability: 'بدهی',
  equity: 'حقوق صاحبان سهام',
  revenue: 'درآمد',
  expense: 'هزینه',
}

const NATURE_LABELS = { debit: 'بدهکار', credit: 'بستانکار' }

export function AccountsPanel({ session }) {
  const permissions = session?.permissions ?? []
  const canWrite = permissions.includes('accounting.accounts.write')

  const [q, setQ] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const { accounts, loading, error, reload } = useAccounts({ q, includeInactive })

  const handleToggleActive = async (acc) => {
    try {
      await accountingApi.patchAccount({ id: acc.id, action: 'toggle_active', isActive: !acc.isActive })
      reload()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleTogglePostable = async (acc) => {
    try {
      await accountingApi.patchAccount({ id: acc.id, action: 'toggle_postable', isPostable: !acc.isPostable })
      reload()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری حساب‌ها">{error}</InlineAlert> : null}

      <DataTable
        minWidthClass="min-w-[980px]"
        toolbar={(
          <WorkspaceToolbar
            embedded
            actions={canWrite ? <Button action="create" showActionIcon size="sm" onClick={() => setCreateModal(true)}>افزودن حساب</Button> : null}
          >
            <FilterRow className="justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full md:w-64">
                  <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="جستجو در کد یا نام..." size="sm" />
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
                  <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
                  شامل غیرفعال
                </label>
              </div>
              <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={reload} disabled={loading} loading={loading} />
            </FilterRow>
          </WorkspaceToolbar>
        )}
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>کد</DataTableHeaderCell>
            <DataTableHeaderCell>نام</DataTableHeaderCell>
            <DataTableHeaderCell align="center">سطح</DataTableHeaderCell>
            <DataTableHeaderCell align="center">نوع</DataTableHeaderCell>
            <DataTableHeaderCell align="center">طبیعت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">قابل ثبت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            {canWrite ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={canWrite ? 8 : 7} state="loading" title="در حال بارگذاری سرفصل‌ها..." />
          ) : accounts.length === 0 ? (
            <DataTableState colSpan={canWrite ? 8 : 7} title="سرفصل حسابی یافت نشد." />
          ) : accounts.map((acc) => (
            <DataTableRow key={acc.id} tone={acc.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis" className="font-mono">{acc.code}</DataTableCell>
              <DataTableCell tone="emphasis" className="text-[rgb(var(--ui-text))]" style={{ paddingRight: `${(acc.level - 1) * 16 + 12}px` }}>
                {acc.name}
              </DataTableCell>
              <DataTableCell align="center">{acc.level}</DataTableCell>
              <DataTableCell align="center">{TYPE_LABELS[acc.accountType] ?? acc.accountType}</DataTableCell>
              <DataTableCell align="center">{NATURE_LABELS[acc.accountNature] ?? acc.accountNature}</DataTableCell>
              <DataTableCell align="center">
                <Badge tone={acc.isPostable ? 'success' : 'neutral'}>{acc.isPostable ? 'بله' : 'خیر'}</Badge>
              </DataTableCell>
              <DataTableCell align="center">
                <Badge tone={acc.isActive ? 'info' : 'danger'}>{acc.isActive ? 'فعال' : 'غیرفعال'}</Badge>
              </DataTableCell>
              {canWrite ? (
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش حساب" tooltip="ویرایش حساب" onClick={() => setEditTarget(acc)} />
                    {!acc.isSystem ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handleTogglePostable(acc)}>
                          {acc.isPostable ? 'غیرقابل‌ثبت' : 'قابل‌ثبت'}
                        </Button>
                        <IconButton
                          action={acc.isActive ? 'delete' : 'restore'}
                          label={acc.isActive ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب'}
                          tooltip={acc.isActive ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب'}
                          onClick={() => handleToggleActive(acc)}
                        />
                      </>
                    ) : null}
                  </DataTableActions>
                </DataTableCell>
              ) : null}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {createModal ? (
        <AccountFormModal
          accounts={accounts}
          onClose={() => setCreateModal(false)}
          onSaved={() => { setCreateModal(false); reload() }}
        />
      ) : null}
      {editTarget ? (
        <AccountFormModal
          accounts={accounts}
          account={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); reload() }}
        />
      ) : null}
    </div>
  )
}
