import { useState } from 'react'
import { Lock, Star } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  IconButton,
  Input,
  Select,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
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

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [cashAccountId, setCashAccountId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [checkAccountId, setCheckAccountId] = useState('')
  const [arAccountId, setArAccountId] = useState('')
  const [mapSaving, setMapSaving] = useState(false)
  const [mapSaved, setMapSaved] = useState(false)
  const [closeCandidate, setCloseCandidate] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  const resetFiscalYearForm = () => {
    setTitle('')
    setStartDate('')
    setEndDate('')
    setEditTarget(null)
    setFormError(null)
  }

  const handleUpsertFY = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editTarget) {
        await accountingApi.patchFiscalYear({ id: editTarget.id, action: 'update', title, startDate, endDate })
      } else {
        await accountingApi.createFiscalYear({ title, startDate, endDate })
      }
      resetFiscalYearForm()
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

  const handleDelete = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'delete' })
      setDeleteCandidate(null)
      if (editTarget?.id === id) resetFiscalYearForm()
      reload()
    } catch (e) { alert(e.message) }
  }

  const handleStartEdit = (fy) => {
    setEditTarget(fy)
    setTitle(fy.title || '')
    setStartDate(fy.startDate || '')
    setEndDate(fy.endDate || '')
    setFormError(null)
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

  const renderAccountOptionLabel = (account) => `${toPN(account.code)} - ${account.name}`

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-black text-[rgb(var(--ui-text))]">سال‌های مالی</div>
          <Button size="sm" variant="ghost" onClick={reload} disabled={loading}>بازخوانی</Button>
        </div>
        {error && <div className="text-xs font-bold text-rose-600">خطا: {error}</div>}
        {loading && <div className="text-xs text-slate-500">در حال بارگذاری...</div>}
        {fiscalYears.length > 0 && (
          <DataTable className="border border-[rgb(var(--ui-border-soft))]" minWidthClass="min-w-[720px]">
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>عنوان</DataTableHeaderCell>
                <DataTableHeaderCell align="center">از تاریخ</DataTableHeaderCell>
                <DataTableHeaderCell align="center">تا تاریخ</DataTableHeaderCell>
                <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
                {canWrite ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
              </tr>
            </DataTableHead>
            <DataTableBody>
              {fiscalYears.map((fy) => (
                <DataTableRow key={fy.id}>
                  <DataTableCell tone="emphasis">
                    {fy.title}
                    {fy.isDefault && <span className="mr-1 rounded bg-blue-100 px-1.5 text-[10px] font-black text-blue-700">پیش‌فرض</span>}
                  </DataTableCell>
                  <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.startDate)}</DataTableCell>
                  <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.endDate)}</DataTableCell>
                  <DataTableCell align="center">
                    <Badge tone={fy.status === 'open' ? 'success' : 'neutral'}>{fy.status === 'open' ? 'باز' : 'بسته'}</Badge>
                  </DataTableCell>
                  {canWrite && (
                    <DataTableCell align="center">
                      <DataTableActions className="grid grid-cols-4 gap-0">
                        {!fy.isDefault && fy.status === 'open' ? (
                          <Button size="iconSm" variant="ghost" onClick={() => handleSetDefault(fy.id)} title="انتخاب سال پیش‌فرض" aria-label="انتخاب سال پیش‌فرض" className="text-amber-600 hover:bg-amber-50">
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        ) : <span aria-hidden="true" className="inline-block h-8 w-8 shrink-0" />}
                        {fy.status === 'open' ? (
                          <Button size="iconSm" variant="ghost" onClick={() => setCloseCandidate(fy.id)} title="بستن سال مالی" aria-label="بستن سال مالی" className="text-slate-600 hover:bg-slate-100">
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                        ) : <span aria-hidden="true" className="inline-block h-8 w-8 shrink-0" />}
                        <IconButton action="edit" size="iconSm" label="ویرایش سال مالی" tooltip="ویرایش سال مالی" onClick={() => handleStartEdit(fy)} />
                        <IconButton action="delete" size="iconSm" label="حذف سال مالی" tooltip="حذف سال مالی" variant="tertiary" className="!border-red-200 !text-red-600 hover:!bg-red-50 hover:!text-red-700" onClick={() => setDeleteCandidate(fy.id)} />
                      </DataTableActions>
                    </DataTableCell>
                  )}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}

        {canWrite && (
          <form onSubmit={handleUpsertFY} className="mt-4 space-y-3 rounded-[var(--radius-xl)] border border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/45 p-3">
            <div className="text-xs font-black text-slate-700">{editTarget ? 'ویرایش سال مالی' : 'افزودن سال مالی جدید'}</div>
            {formError && <div className="text-xs font-bold text-rose-600">{formError}</div>}
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">عنوان</label>
                <Input
                  size="sm"
                  value={title}
                  onChange={(e) => setTitle(toPN(e.target.value))}
                  placeholder="مثال: سال مالی ۱۴۰۳"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? 'در حال ذخیره...' : editTarget ? 'ذخیره تغییرات' : 'ایجاد سال مالی'}
              </Button>
              {editTarget ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetFiscalYearForm}>انصراف</Button>
              ) : null}
            </div>
          </form>
        )}
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="text-sm font-black text-[rgb(var(--ui-text))]">تب‌های فعال</div>
        <div className="flex flex-wrap items-center gap-2">
          {CONFIGURABLE_TABS.map((tab) => {
            const enabled = visibility === null ? true : (visibility[tab.id] !== false)
            return (
              <label key={tab.id}
                className={`flex min-w-[132px] flex-none cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors
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

      {canWrite && (
        <Card padding="md" className="space-y-3">
          <div className="text-sm font-black text-[rgb(var(--ui-text))]">تنظیم حساب‌های پل فروش</div>
          <div className="flex flex-wrap items-end gap-3">
            {[
              { label: 'حساب صندوق (نقد)', value: cashAccountId, setter: setCashAccountId },
              { label: 'حساب بانک (کارت/انتقال)', value: bankAccountId, setter: setBankAccountId },
              { label: 'حساب اسناد دریافتنی (چک)', value: checkAccountId, setter: setCheckAccountId },
              { label: 'حساب دریافتنی تجاری (AR)', value: arAccountId, setter: setArAccountId },
            ].map(({ label, value, setter }) => (
              <div key={label} className="min-w-[220px] flex-1 sm:max-w-[280px]">
                <label className="block text-xs font-black text-slate-600 mb-1">{label}</label>
                <Select size="sm" value={value} onChange={(e) => setter(e.target.value)}>
                  <option value="">-- انتخاب حساب --</option>
                  {postableAccounts.map((a) => <option key={a.id} value={a.id}>{renderAccountOptionLabel(a)}</option>)}
                </Select>
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
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="حذف سال مالی"
        description="این سال مالی حذف شود؟ این عمل فقط برای سال‌هایی که سند ندارند مجاز است."
        confirmLabel="حذف سال"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => deleteCandidate ? handleDelete(deleteCandidate) : undefined}
      />
    </div>
  )
}
