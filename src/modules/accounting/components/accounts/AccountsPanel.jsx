import { useState } from 'react'
import { Button, Card, EmptyState } from '@/components/shared/ui'
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
    <Card padding="none">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
        <input
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="جستجو در کد یا نام..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          شامل غیرفعال
        </label>
        <div className="flex-1" />
        {canWrite && (
          <Button size="sm" variant="primary" onClick={() => setCreateModal(true)}>
            + افزودن حساب
          </Button>
        )}
      </div>

      {error && <div className="p-4 text-xs font-bold text-rose-600">خطا: {error}</div>}
      {loading && <div className="p-4 text-xs font-bold text-slate-500">در حال بارگذاری...</div>}

      {!loading && accounts.length === 0 && (
        <EmptyState message="سرفصل حسابی یافت نشد." />
      )}

      {!loading && accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">سطح</th>
                <th className="px-3 py-2">نوع</th>
                <th className="px-3 py-2">طبیعت</th>
                <th className="px-3 py-2">قابل ثبت</th>
                <th className="px-3 py-2">وضعیت</th>
                {canWrite && <th className="px-3 py-2">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => (
                <tr key={acc.id} className={`hover:bg-slate-50 ${!acc.isActive ? 'opacity-50' : ''}`}
                    style={{ paddingRight: `${(acc.level - 1) * 12}px` }}>
                  <td className="px-3 py-2 font-mono font-black text-slate-900">{acc.code}</td>
                  <td className="px-3 py-2 font-bold text-slate-800"
                      style={{ paddingRight: `${(acc.level - 1) * 16 + 12}px` }}>
                    {acc.name}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{acc.level}</td>
                  <td className="px-3 py-2 text-slate-600">{TYPE_LABELS[acc.accountType] ?? acc.accountType}</td>
                  <td className="px-3 py-2 text-slate-600">{NATURE_LABELS[acc.accountNature] ?? acc.accountNature}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${acc.isPostable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {acc.isPostable ? 'بله' : 'خیر'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${acc.isActive ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-600'}`}>
                      {acc.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(acc)}>ویرایش</Button>
                        {!acc.isSystem && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleTogglePostable(acc)}>
                              {acc.isPostable ? 'غیرقابل‌ثبت' : 'قابل‌ثبت'}
                            </Button>
                            <Button size="sm" variant={acc.isActive ? 'danger' : 'success'}
                                    onClick={() => handleToggleActive(acc)}>
                              {acc.isActive ? 'غیرفعال' : 'فعال'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createModal && (
        <AccountFormModal
          accounts={accounts}
          onClose={() => setCreateModal(false)}
          onSaved={() => { setCreateModal(false); reload() }}
        />
      )}
      {editTarget && (
        <AccountFormModal
          accounts={accounts}
          account={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); reload() }}
        />
      )}
    </Card>
  )
}
