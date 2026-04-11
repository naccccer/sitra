import { useEffect, useMemo, useState } from 'react'
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
  FieldMessage,
  FormField,
  FormSection,
  InlineAlert,
  Input,
  SectionHeader,
} from '@/components/shared/ui'
import { useFiscalYears } from '../../hooks/useFiscalYears'
import { useAccounts } from '../../hooks/useAccounts'
import { accountingApi } from '../../services/accountingApi'
import { toShamsiDisplay } from '../../utils/dateUtils'
import { ShamsiDateInput } from '../DatePickerWrapper'
import { useTabSettings, CONFIGURABLE_TABS } from '../../hooks/useTabSettings'
import { AccountingSettingsOverview, BridgeMapSection, TabVisibilitySection } from './AccountingSettingsSections'

const BRIDGE_MAP_KEY = 'accounting.bridge.account_map'

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
  const [mapError, setMapError] = useState(null)
  const [closeCandidate, setCloseCandidate] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    if (!canWrite) return
    let active = true
    const loadMap = async () => {
      try {
        const payload = await accountingApi.fetchSetting(BRIDGE_MAP_KEY)
        const rawMap = payload?.value ? JSON.parse(payload.value) : {}
        if (!active) return
        setCashAccountId(String(rawMap?.cash_account_id || ''))
        setBankAccountId(String(rawMap?.bank_account_id || ''))
        setCheckAccountId(String(rawMap?.check_account_id || ''))
        setArAccountId(String(rawMap?.ar_account_id || ''))
      } catch {
        if (active) setMapError('بارگذاری تنظیم حساب های پل فروش ناموفق بود.')
      }
    }
    loadMap()
    return () => { active = false }
  }, [canWrite])

  const activeFiscalYearCount = useMemo(() => fiscalYears.filter((fy) => fy.status === 'open').length, [fiscalYears])
  const defaultFiscalYear = useMemo(() => fiscalYears.find((fy) => fy.isDefault), [fiscalYears])
  const visibleTabCount = useMemo(() => {
    if (visibility === null) return CONFIGURABLE_TABS.length
    return CONFIGURABLE_TABS.filter((tab) => visibility[tab.id] !== false).length
  }, [visibility])

  const bridgeMapFields = [
    { label: 'حساب صندوق (نقد)', value: cashAccountId, setter: setCashAccountId },
    { label: 'حساب بانک (کارت/انتقال)', value: bankAccountId, setter: setBankAccountId },
    { label: 'حساب اسناد دریافتنی (چک)', value: checkAccountId, setter: setCheckAccountId },
    { label: 'حساب دریافتنی تجاری (AR)', value: arAccountId, setter: setArAccountId },
  ]

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
      if (editTarget) await accountingApi.patchFiscalYear({ id: editTarget.id, action: 'update', title, startDate, endDate })
      else await accountingApi.createFiscalYear({ title, startDate, endDate })
      resetFiscalYearForm()
      reload()
    } catch (upsertError) {
      setFormError(upsertError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAccountMap = async () => {
    setMapSaving(true)
    setMapError(null)
    try {
      await accountingApi.saveBridgeAccountMap({
        cash_account_id: cashAccountId || null,
        bank_account_id: bankAccountId || null,
        check_account_id: checkAccountId || null,
        ar_account_id: arAccountId || null,
      })
      setMapSaved(true)
      setTimeout(() => setMapSaved(false), 3000)
    } catch (saveError) {
      setMapError(saveError?.message || 'ذخیره نگاشت حساب ها ناموفق بود.')
    } finally {
      setMapSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <AccountingSettingsOverview
        fiscalYears={fiscalYears}
        activeFiscalYearCount={activeFiscalYearCount}
        defaultFiscalYear={defaultFiscalYear}
        loading={loading}
        onReload={reload}
        toShamsiDisplay={toShamsiDisplay}
        visibleTabCount={visibleTabCount}
      />

      <Card padding="md" className="space-y-4">
        <SectionHeader title="سال های مالی" description="ایجاد، ویرایش، بستن و تعیین سال پیش فرض از این بخش انجام می شود." />
        {error ? <InlineAlert tone="danger">خطا: {error}</InlineAlert> : null}
        {loading ? <InlineAlert tone="neutral">در حال بارگذاری سال های مالی...</InlineAlert> : null}

        {fiscalYears.length > 0 ? (
          <DataTable className="border border-[rgb(var(--ui-border-soft))]" minWidthClass="min-w-[720px]">
            <DataTableHead><tr>
              <DataTableHeaderCell>عنوان</DataTableHeaderCell>
              <DataTableHeaderCell align="center">از تاریخ</DataTableHeaderCell>
              <DataTableHeaderCell align="center">تا تاریخ</DataTableHeaderCell>
              <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
              {canWrite ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
            </tr></DataTableHead>
            <DataTableBody>
              {fiscalYears.map((fy) => (
                <DataTableRow key={fy.id}>
                  <DataTableCell tone="emphasis">
                    {fy.title}
                    {fy.isDefault ? <span className="mr-1 rounded bg-blue-100 px-1.5 text-[10px] font-black text-blue-700">پیش فرض</span> : null}
                  </DataTableCell>
                  <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.startDate)}</DataTableCell>
                  <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.endDate)}</DataTableCell>
                  <DataTableCell align="center"><Badge tone={fy.status === 'open' ? 'success' : 'neutral'}>{fy.status === 'open' ? 'باز' : 'بسته'}</Badge></DataTableCell>
                  {canWrite ? (
                    <DataTableCell align="center"><DataTableActions>
                      {!fy.isDefault && fy.status === 'open' ? <Button size="sm" variant="ghost" onClick={() => accountingApi.patchFiscalYear({ id: fy.id, action: 'set_default' }).then(reload).catch((e) => alert(e.message))}>پیش فرض</Button> : null}
                      <Button size="sm" variant="ghost" onClick={() => { setEditTarget(fy); setTitle(fy.title || ''); setStartDate(fy.startDate || ''); setEndDate(fy.endDate || ''); setFormError(null) }}>ویرایش</Button>
                      {fy.status === 'open' ? <Button size="sm" variant="danger" onClick={() => setCloseCandidate(fy.id)}>بستن</Button> : null}
                      <Button size="sm" variant="danger" onClick={() => setDeleteCandidate(fy.id)}>حذف</Button>
                    </DataTableActions></DataTableCell>
                  ) : null}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}

        {canWrite ? (
          <FormSection title={editTarget ? 'ویرایش سال مالی' : 'افزودن سال مالی جدید'}>
            <form onSubmit={handleUpsertFY} className="space-y-3">
              <FieldMessage tone="danger">{formError}</FieldMessage>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="عنوان" required><Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: سال مالی ۱۴۰۴" required /></FormField>
                <FormField label="از تاریخ" required><ShamsiDateInput value={startDate} onChange={setStartDate} className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900" /></FormField>
                <FormField label="تا تاریخ" required><ShamsiDateInput value={endDate} onChange={setEndDate} className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900" /></FormField>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? 'در حال ذخیره...' : editTarget ? 'ذخیره تغییرات' : 'ایجاد سال مالی'}</Button>
                {editTarget ? <Button type="button" variant="ghost" size="sm" onClick={resetFiscalYearForm}>انصراف</Button> : null}
              </div>
            </form>
          </FormSection>
        ) : null}
      </Card>

      <TabVisibilitySection
        tabs={CONFIGURABLE_TABS}
        visibility={visibility}
        saving={savingTabs}
        onToggle={(tabId, checked) => saveTabSettings({ ...(visibility ?? {}), [tabId]: checked })}
      />

      <BridgeMapSection
        canWrite={canWrite}
        mapError={mapError}
        mapSaved={mapSaved}
        mapSaving={mapSaving}
        fields={bridgeMapFields}
        postableAccounts={postableAccounts}
        onSave={handleSaveAccountMap}
      />

      <ConfirmDialog
        isOpen={Boolean(closeCandidate)}
        title="بستن سال مالی"
        description="آیا مطمئنید؟ بستن سال مالی غیرقابل بازگشت است."
        confirmLabel="بستن سال"
        onCancel={() => setCloseCandidate(null)}
        onConfirm={() => closeCandidate ? accountingApi.patchFiscalYear({ id: closeCandidate, action: 'close' }).then(() => { setCloseCandidate(null); reload() }).catch((e) => alert(e.message)) : undefined}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="حذف سال مالی"
        description="این سال مالی حذف شود؟ این عمل فقط برای سال هایی که سند ندارند مجاز است."
        confirmLabel="حذف سال"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => deleteCandidate ? accountingApi.patchFiscalYear({ id: deleteCandidate, action: 'delete' }).then(() => { setDeleteCandidate(null); if (editTarget?.id === deleteCandidate) resetFiscalYearForm(); reload() }).catch((e) => alert(e.message)) : undefined}
      />
    </div>
  )
}
