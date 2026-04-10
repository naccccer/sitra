import { useEffect, useState } from 'react'
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
  DataTableState,
  IconButton,
  InlineAlert,
  Input,
  SectionHeader,
  Select,
} from '@/components/shared/ui'
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

  useEffect(() => {
    let active = true
    const loadBridgeMap = async () => {
      try {
        const data = await accountingApi.fetchSetting('accounting.bridge.account_map')
        const value = data?.value ? JSON.parse(data.value) : {}
        if (!active || !value || typeof value !== 'object') return
        setCashAccountId(value.cash_account_id ? String(value.cash_account_id) : '')
        setBankAccountId(value.bank_account_id ? String(value.bank_account_id) : '')
        setCheckAccountId(value.check_account_id ? String(value.check_account_id) : '')
        setArAccountId(value.ar_account_id ? String(value.ar_account_id) : '')
      } catch {
        if (!active) return
      }
    }
    void loadBridgeMap()
    return () => { active = false }
  }, [])

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

  return (
    <div className="space-y-4">
      {/* Fiscal years list */}
      <Card padding="md" className="space-y-3">
        <SectionHeader
          title="سال‌های مالی"
          description="مدیریت سال‌های مالی، پیش‌فرض‌سازی و بستن دوره‌ها از این بخش انجام می‌شود."
          actions={<IconButton action="reload" label="بازخوانی سال‌ها" tooltip="بازخوانی سال‌ها" onClick={reload} loading={loading} disabled={loading} />}
        />
        {error ? <InlineAlert tone="danger" title="خطا در بارگذاری سال‌های مالی">{error}</InlineAlert> : null}
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
            {loading ? (
              <DataTableState colSpan={canWrite ? 5 : 4} state="loading" title="در حال بارگذاری سال‌های مالی..." />
            ) : fiscalYears.length === 0 ? (
              <DataTableState colSpan={canWrite ? 5 : 4} title="سال مالی ثبت نشده است." description="برای شروع یک سال مالی جدید ایجاد کنید." />
            ) : fiscalYears.map((fy) => (
              <DataTableRow key={fy.id}>
                <DataTableCell tone="emphasis">{fy.title}{fy.isDefault ? <span className="mr-1 rounded bg-blue-100 px-1.5 text-[10px] font-black text-blue-700">پیش‌فرض</span> : null}</DataTableCell>
                <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.startDate)}</DataTableCell>
                <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.endDate)}</DataTableCell>
                <DataTableCell align="center"><Badge tone={fy.status === 'open' ? 'success' : 'neutral'}>{fy.status === 'open' ? 'باز' : 'بسته'}</Badge></DataTableCell>
                {canWrite ? <DataTableCell align="center"><DataTableActions>
                  {!fy.isDefault && fy.status === 'open' ? <Button size="sm" variant="tertiary" onClick={() => handleSetDefault(fy.id)}>پیش‌فرض</Button> : null}
                  <IconButton action="edit" size="iconSm" surface="table" label="ویرایش سال مالی" tooltip="ویرایش سال مالی" onClick={() => handleStartEdit(fy)} />
                  {fy.status === 'open' ? <Button size="sm" variant="danger" onClick={() => setCloseCandidate(fy.id)}>بستن</Button> : null}
                  <IconButton action="delete" size="iconSm" surface="table" label="حذف سال مالی" tooltip="حذف سال مالی" variant="danger" onClick={() => setDeleteCandidate(fy.id)} />
                </DataTableActions></DataTableCell> : null}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>

        {canWrite && (
          <form onSubmit={handleUpsertFY} className="mt-4 space-y-3 rounded-[var(--radius-2xl)] border border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/50 p-4">
            <SectionHeader title={editTarget ? 'ویرایش سال مالی' : 'افزودن سال مالی جدید'} className="!gap-1" />
            {formError ? <InlineAlert tone="danger" title="خطا در ذخیره سال مالی">{formError}</InlineAlert> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1">عنوان</label>
                <Input
                  size="sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: سال مالی ۱۴۰۳"
                  required
                />
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
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" action="save" variant="primary" size="sm" disabled={saving}>
                {saving ? 'در حال ذخیره...' : editTarget ? 'ذخیره تغییرات' : 'ایجاد سال مالی'}
              </Button>
              {editTarget ? (
                <Button type="button" action="cancel" variant="quiet" size="sm" onClick={resetFiscalYearForm}>انصراف</Button>
              ) : null}
            </div>
          </form>
        )}
      </Card>

      {/* Tab visibility */}
      <Card padding="md" className="space-y-3">
        <SectionHeader title="تب‌های فعال" description="فعال یا غیرفعال بودن تب‌ها در فضای کاری حسابداری را کنترل کنید." />
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
        {savingTabs ? <div className="text-xs font-bold text-slate-500">در حال ذخیره...</div> : null}
      </Card>

      {/* Bridge account map */}
      {canWrite && (
        <Card padding="md" className="space-y-3">
          <SectionHeader title="تنظیم حساب‌های پل فروش" description="برای صدور سند خودکار فروش، حساب‌های متناظر هر روش دریافت را مشخص کنید." />
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
                  {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" action="save" size="sm" onClick={handleSaveAccountMap} disabled={mapSaving}>
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
