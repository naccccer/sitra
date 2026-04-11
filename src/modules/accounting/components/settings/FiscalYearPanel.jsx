import { useState } from 'react'
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
  FormField,
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

  const resetFiscalYearForm = () => {
    setTitle('')
    setStartDate('')
    setEndDate('')
    setEditTarget(null)
    setFormError(null)
  }

  const handleUpsertFY = async (event) => {
    event.preventDefault()
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
    } catch (nextError) {
      setFormError(nextError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'set_default' })
      reload()
    } catch (nextError) {
      alert(nextError.message)
    }
  }

  const handleClose = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'close' })
      setCloseCandidate(null)
      reload()
    } catch (nextError) {
      alert(nextError.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await accountingApi.patchFiscalYear({ id, action: 'delete' })
      setDeleteCandidate(null)
      if (editTarget?.id === id) resetFiscalYearForm()
      reload()
    } catch (nextError) {
      alert(nextError.message)
    }
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
      await accountingApi.saveBridgeAccountMap({
        cash_account_id: cashAccountId || null,
        bank_account_id: bankAccountId || null,
        check_account_id: checkAccountId || null,
        ar_account_id: arAccountId || null,
      })
      setMapSaved(true)
      setTimeout(() => setMapSaved(false), 3000)
    } catch (nextError) {
      alert(nextError.message)
    } finally {
      setMapSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4">
        <SectionHeader
          title="سال‌های مالی"
          description="تعریف، ویرایش و بستن سال‌های مالی فعال در یک جدول استاندارد."
          actions={<Button action="reload" size="sm" onClick={reload} disabled={loading} />}
        />

        {error ? <InlineAlert tone="danger">خطا: {error}</InlineAlert> : null}

        <DataTable className="border border-[rgb(var(--ui-border-soft))]" minWidthClass="min-w-[760px]">
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
            {loading ? <DataTableState colSpan={canWrite ? 5 : 4} state="loading" title="در حال بارگذاری سال‌های مالی..." /> : null}
            {!loading && fiscalYears.length === 0 ? <DataTableState colSpan={canWrite ? 5 : 4} title="سال مالی ثبت نشده است." /> : null}
            {!loading && fiscalYears.map((fy) => (
              <DataTableRow key={fy.id}>
                <DataTableCell tone="emphasis">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{fy.title}</span>
                    {fy.isDefault ? <Badge tone="info">پیش‌فرض</Badge> : null}
                  </div>
                </DataTableCell>
                <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.startDate)}</DataTableCell>
                <DataTableCell align="center" className="tabular-nums">{toShamsiDisplay(fy.endDate)}</DataTableCell>
                <DataTableCell align="center">
                  <Badge tone={fy.status === 'open' ? 'success' : 'neutral'}>{fy.status === 'open' ? 'باز' : 'بسته'}</Badge>
                </DataTableCell>
                {canWrite ? (
                  <DataTableCell align="center">
                    <DataTableActions>
                      {!fy.isDefault && fy.status === 'open' ? <Button size="sm" variant="secondary" onClick={() => handleSetDefault(fy.id)}>پیش‌فرض</Button> : null}
                      <IconButton action="edit" label="ویرایش سال مالی" tooltip="ویرایش سال مالی" surface="table" onClick={() => handleStartEdit(fy)} />
                      {fy.status === 'open' ? <Button size="sm" variant="destructive" onClick={() => setCloseCandidate(fy.id)}>بستن</Button> : null}
                      <IconButton action="delete" label="حذف سال مالی" tooltip="حذف سال مالی" surface="table" onClick={() => setDeleteCandidate(fy.id)} />
                    </DataTableActions>
                  </DataTableCell>
                ) : null}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>

        {canWrite ? (
          <form onSubmit={handleUpsertFY} className="space-y-3 rounded-[var(--radius-xl)] border border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/40 p-3">
            <SectionHeader
              title={editTarget ? 'ویرایش سال مالی' : 'افزودن سال مالی جدید'}
              description="برای حفظ دقت گزارش‌ها، بازه تاریخ را بدون همپوشانی تعریف کنید."
              actions={editTarget ? <Button action="cancel" size="sm" onClick={resetFiscalYearForm} /> : null}
            />
            {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="عنوان" required>
                <Input size="sm" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: سال مالی ۱۴۰۵" required />
              </FormField>
              <FormField label="از تاریخ" required>
                <ShamsiDateInput value={startDate} onChange={setStartDate} className="w-full cursor-pointer rounded-lg border border-[rgb(var(--ui-border-soft))] bg-white px-3 py-2 text-xs font-bold text-[rgb(var(--ui-text))]" />
              </FormField>
              <FormField label="تا تاریخ" required>
                <ShamsiDateInput value={endDate} onChange={setEndDate} className="w-full cursor-pointer rounded-lg border border-[rgb(var(--ui-border-soft))] bg-white px-3 py-2 text-xs font-bold text-[rgb(var(--ui-text))]" />
              </FormField>
            </div>

            <Button type="submit" action="save" size="sm" loading={saving}>
              {saving ? 'در حال ذخیره...' : editTarget ? 'ذخیره تغییرات' : 'ایجاد سال مالی'}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card padding="md" className="space-y-3">
        <SectionHeader title="تب‌های فعال" description="نمایش تب‌ها را متناسب با فرآیند تیم مالی تنظیم کنید." />
        <div className="flex flex-wrap items-center gap-2">
          {CONFIGURABLE_TABS.map((tab) => {
            const enabled = visibility === null ? true : visibility[tab.id] !== false
            return (
              <Button
                key={tab.id}
                size="sm"
                variant={enabled ? 'secondary' : 'tertiary'}
                selected={enabled}
                onClick={() => saveTabSettings({ ...(visibility ?? {}), [tab.id]: !enabled })}
                disabled={savingTabs}
              >
                {tab.label}
              </Button>
            )
          })}
        </div>
        {savingTabs ? <InlineAlert tone="neutral">در حال ذخیره تنظیمات تب‌ها...</InlineAlert> : null}
      </Card>

      {canWrite ? (
        <Card padding="md" className="space-y-3">
          <SectionHeader title="تنظیم حساب‌های پل فروش" description="نگاشت حساب‌های مقصد برای اسناد فروش خودکار." />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { key: 'cash', label: 'حساب صندوق (نقد)', value: cashAccountId, setter: setCashAccountId },
              { key: 'bank', label: 'حساب بانک (کارت/انتقال)', value: bankAccountId, setter: setBankAccountId },
              { key: 'check', label: 'حساب اسناد دریافتنی (چک)', value: checkAccountId, setter: setCheckAccountId },
              { key: 'ar', label: 'حساب دریافتنی تجاری (AR)', value: arAccountId, setter: setArAccountId },
            ].map(({ key, label, value, setter }) => (
              <FormField key={key} label={label}>
                <Select size="sm" value={value} onChange={(event) => setter(event.target.value)}>
                  <option value="">-- انتخاب حساب --</option>
                  {postableAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </Select>
              </FormField>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button action="save" size="sm" loading={mapSaving} onClick={handleSaveAccountMap}>
              {mapSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </Button>
            {mapSaved ? <Badge tone="success">ذخیره شد</Badge> : null}
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(closeCandidate)}
        title="بستن سال مالی"
        description="آیا مطمئنید؟ بستن سال مالی غیرقابل بازگشت است."
        confirmLabel="بستن سال"
        onCancel={() => setCloseCandidate(null)}
        onConfirm={() => (closeCandidate ? handleClose(closeCandidate) : undefined)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="حذف سال مالی"
        description="این سال مالی حذف شود؟ این عمل فقط برای سال‌هایی که سند ندارند مجاز است."
        confirmLabel="حذف سال"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => (deleteCandidate ? handleDelete(deleteCandidate) : undefined)}
      />
    </div>
  )
}
