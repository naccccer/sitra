import { useState } from 'react'
import { Search } from 'lucide-react'
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
  const [view, setView] = useState('active')
  const [createModal, setCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const { accounts, loading, error, reload } = useAccounts({ q, view })

  const handleLifecycleAction = async (acc, action) => {
    try {
      await accountingApi.patchAccount({ id: acc.id, action })
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
          <WorkspaceToolbar embedded>
            <FilterRow className="justify-start gap-3" dir="ltr">
              <div className="flex w-fit shrink-0 flex-nowrap items-center gap-2" dir="ltr">
                {canWrite ? <Button action="create" showActionIcon size="sm" onClick={() => setCreateModal(true)}>افزودن حساب</Button> : null}
                <div className="relative w-64 shrink-0">
                  <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))]" />
                  <Input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="جستجو در کد یا نام..."
                    size="sm"
                    className="bg-white/90 pr-9 text-[12px]"
                  />
                </div>
                <IconButton
                  action="archive"
                  variant={view === 'archived' ? 'primary' : 'secondary'}
                  label={view === 'archived' ? 'بازگشت به فعال‌ها' : 'نمایش بایگانی'}
                  tooltip={view === 'archived' ? 'بازگشت به فعال‌ها' : 'نمایش بایگانی'}
                  onClick={() => setView((prev) => (prev === 'archived' ? 'active' : 'archived'))}
                />
                <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={reload} disabled={loading} loading={loading} />
              </div>
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
                <Badge tone={acc.isActive ? 'info' : 'neutral'}>{acc.isActive ? 'فعال' : 'بایگانی‌شده'}</Badge>
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
                        {view === 'active' ? (
                          <IconButton
                            action="archive"
                            label="بایگانی حساب"
                            tooltip="بایگانی حساب"
                            onClick={() => handleLifecycleAction(acc, 'archive')}
                          />
                        ) : (
                          <>
                            <IconButton
                              action="restore"
                              label="بازگردانی حساب"
                              tooltip="بازگردانی حساب"
                              onClick={() => handleLifecycleAction(acc, 'restore')}
                            />
                            <IconButton
                              action="delete"
                              label="حذف حساب"
                              tooltip="حذف حساب"
                              onClick={() => handleLifecycleAction(acc, 'delete')}
                            />
                          </>
                        )}
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
