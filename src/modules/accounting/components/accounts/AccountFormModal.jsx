import { useState } from 'react'
import { ModalShell, Button } from '@/components/shared/ui'
import { accountingApi } from '../../services/accountingApi'

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'دارایی' },
  { value: 'liability', label: 'بدهی' },
  { value: 'equity', label: 'حقوق صاحبان سهام' },
  { value: 'revenue', label: 'درآمد' },
  { value: 'expense', label: 'هزینه' },
]

export function AccountFormModal({ account, accounts = [], onClose, onSaved }) {
  const isEdit = Boolean(account)
  const [code, setCode] = useState(account?.code ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [level, setLevel] = useState(account?.level ?? 3)
  const [parentId, setParentId] = useState(account?.parentId ?? '')
  const [accountType, setAccountType] = useState(account?.accountType ?? 'asset')
  const [accountNature, setAccountNature] = useState(account?.accountNature ?? 'debit')
  const [notes, setNotes] = useState(account?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const parentOptions = accounts.filter((a) => a.level < level && a.isActive)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await accountingApi.updateAccount({ id: account.id, name, notes })
      } else {
        await accountingApi.createAccount({
          code, name, level: Number(level),
          parentId: parentId || null,
          accountType, accountNature, notes,
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
      title={isEdit ? 'ویرایش سرفصل حساب' : 'افزودن سرفصل حساب جدید'}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
        </div>
      }
    >
      {error && <div className="mb-3 rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && (
          <>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">کد حساب *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 1103"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">سطح *</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={level} onChange={(e) => setLevel(Number(e.target.value))}
              >
                <option value={1}>۱ - گروه</option>
                <option value={2}>۲ - کل</option>
                <option value={3}>۳ - معین</option>
                <option value={4}>۴ - تفصیلی (قابل ثبت)</option>
              </select>
            </div>
            {level > 1 && (
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">حساب پدر</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={parentId} onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">-- انتخاب کنید --</option>
                  {parentOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">نوع حساب *</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={accountType} onChange={(e) => setAccountType(e.target.value)}
              >
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">طبیعت حساب *</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={accountNature} onChange={(e) => setAccountNature(e.target.value)}
              >
                <option value="debit">بدهکار</option>
                <option value="credit">بستانکار</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1">نام حساب *</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={name} onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1">توضیحات</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </ModalShell>
  )
}
