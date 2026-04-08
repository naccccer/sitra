import { useState } from 'react'
import { Button, Card, ConfirmDialog } from '@/components/shared/ui'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { useAccounts } from '../../hooks/useAccounts'
import { accountingApi } from '../../services/accountingApi'
import { toShamsiDisplay } from '../../utils/dateUtils'
import { ShamsiDateInput } from '../DatePickerWrapper'
import { useTabSettings, CONFIGURABLE_TABS } from '../../hooks/useTabSettings'

export function FiscalYearPanel({ session }) {
  const permissions = session?.permissions ?? []
  const canWrite = permissions.includes('accounting.settings.write')
  const { visibility, save: saveTabSettings, saving: savingTabs } = useTabSettings()

  const { fiscalYears, loading, error, reload } = useFiscalYears()
  const { accounts: postableAccounts } = useAccounts({ postableOnly: true })

  // New fiscal year form
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Bridge account map
  const [cashAccountId, setCashAccountId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [checkAccountId, setCheckAccountId] = useState('')
  const [arAccountId, setArAccountId] = useState('')
  const [mapSaving, setMapSaving] = useState(false)
  const [mapSaved, setMapSaved] = useState(false)
  const [closeCandidate, setCloseCandidate] = useState(null)

  const handleCreateFY = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await accountingApi.createFiscalYear({ title, startDate, endDate })
      setTitle(''); setStartDate(''); setEndDate('')
      reload()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'set_default' })
      reload()
    } catch (e) { alert(e.message) }
  }

  const handleClose = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'close' })
      setCloseCandidate(null)
      reload()
    } catch (e) { alert(e.message) }
  }

  const handleSaveAccountMap = async () => {
    setMapSaving(true)
    try {
      const map = {
        cash_account_id: cashAccountId || null,
        bank_account_id: bankAccountId || null,
        check_account_id: checkAccountId || null,
        ar_account_id: arAccountId || null,
      }
      await accountingApi.saveBridgeAccountMap(map)
      setMapSaved(true)
      setTimeout(() => setMapSaved(false), 3000)
    } catch (e) { alert(e.message) }
    finally { setMapSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Fiscal years list */}
      <Card padding="md" className="space-y-3">
        <div className="text-sm font-black text-slate-900">سال‌های مالی</div>
        {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}
        {loading && <div className="text-xs text-slate-500">در حال بارگذاری...</div>}

        {fiscalYears.length > 0 && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">عنوان</th>
                <th className="px-3 py-2">از تاریخ</th>
                <th className="px-3 py-2">تا تاریخ</th>
                <th className="px-3 py-2">وضعیت</th>
                {canWrite && <th className="px-3 py-2">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fiscalYears.map((fy) => (
                <tr key={fy.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900">
                    {fy.title}
                    {fy.isDefault && <span className="mr-1 rounded bg-blue-100 px-1.5 text-[10px] font-black text-blue-700">پیش‌فرض</span>}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{toShamsiDisplay(fy.startDate)}</td>
                  <td className="px-3 py-2 tabular-nums">{toShamsiDisplay(fy.endDate)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${fy.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {fy.status === 'open' ? 'باز' : 'بسته'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {!fy.isDefault && fy.status === 'open' && (
                          <Button size="sm" variant="ghost" onClick={() => handleSetDefault(fy.id)}>پیش‌فرض</Button>
                        )}
                        {fy.status === 'open' && (
                          <Button size="sm" variant="danger" onClick={() => setCloseCandidate(fy.id)}>بستن</Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canWrite && (
          <form onSubmit={handleCreateFY} className="mt-4 border-t border-slate-100 pt-4 space-y-3">
            <div className="text-xs font-black text-slate-700">افزودن سال مالی جدید</div>
            {formError && <div className="text-xs font-bold text-rose-600">{formError}</div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">عنوان</label>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
                  value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: سال مالی ۱۴۰۳" required />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">از تاریخ</label>
                <ShamsiDateInput value={startDate} onChange={setStartDate}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">تا تاریخ</label>
                <ShamsiDateInput value={endDate} onChange={setEndDate}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer" />
              </div>
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'در حال ذخیره...' : 'ایجاد سال مالی'}
            </Button>
          </form>
        )}
      </Card>

      {/* Tab visibility */}
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-sm font-black text-slate-900">تب‌های فعال</div>
          <div className="text-xs font-bold text-slate-500">
            تب‌های غیرفعال در منوی بالای صفحه نمایش داده نمی‌شوند.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CONFIGURABLE_TABS.map((tab) => {
            const enabled = visibility === null ? true : (visibility[tab.id] !== false)
            return (
              <label key={tab.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors
                  ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={enabled}
                  onChange={(e) => {
                    const next = { ...(visibility ?? {}), [tab.id]: e.target.checked }
                    saveTabSettings(next)
                  }}
                  disabled={savingTabs}
                />
                {tab.label}
              </label>
            )
          })}
        </div>
        {savingTabs && <div className="text-xs font-bold text-slate-500">در حال ذخیره...</div>}
      </Card>

      {/* Bridge account map */}
      {canWrite && (
        <Card padding="md" className="space-y-3">
          <div className="text-sm font-black text-slate-900">تنظیم حساب‌های پل فروش</div>
          <div className="text-xs font-bold text-slate-500">
            این حساب‌ها هنگام همگام‌سازی پرداخت‌های فروش استفاده می‌شوند.
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'حساب صندوق (نقد)', value: cashAccountId, setter: setCashAccountId },
              { label: 'حساب بانک (کارت/انتقال)', value: bankAccountId, setter: setBankAccountId },
              { label: 'حساب اسناد دریافتنی (چک)', value: checkAccountId, setter: setCheckAccountId },
              { label: 'حساب دریافتنی تجاری (AR)', value: arAccountId, setter: setArAccountId },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-xs font-black text-slate-600 mb-1">{label}</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
                  value={value} onChange={(e) => setter(e.target.value)}>
                  <option value="">-- انتخاب حساب --</option>
                  {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveAccountMap} disabled={mapSaving}>
              {mapSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </Button>
            {mapSaved && <span className="text-xs font-bold text-emerald-700">ذخیره شد ✓</span>}
          </div>
        </Card>
      )}
      <ConfirmDialog
        isOpen={Boolean(closeCandidate)}
        title="بستن سال مالی"
        description="آیا مطمئنید؟ بستن سال مالی غیرقابل بازگشت است."
        confirmLabel="بستن سال"
        onCancel={() => setCloseCandidate(null)}
        onConfirm={() => closeCandidate ? handleClose(closeCandidate) : undefined}
      />
    </div>
  )
}
