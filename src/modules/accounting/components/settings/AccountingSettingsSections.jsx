import {
  Badge,
  Button,
  Card,
  FieldMessage,
  FormField,
  InlineAlert,
  SectionHeader,
  Select,
} from '@/components/shared/ui'

export function AccountingSettingsOverview({
  fiscalYears,
  activeFiscalYearCount,
  defaultFiscalYear,
  loading,
  onReload,
  toShamsiDisplay,
  visibleTabCount,
}) {
  return (
    <Card padding="md" tone="accent" className="space-y-4">
      <SectionHeader
        eyebrow="تنظیمات حسابداری"
        title="پیکربندی سال مالی و یکپارچه سازی پل فروش"
        description="در این بخش تقویم مالی، تب های قابل نمایش و نگاشت حساب های پل فروش را مدیریت کنید."
        action={<Button size="sm" variant="ghost" onClick={onReload} disabled={loading}>بازخوانی اطلاعات</Button>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="تعداد سال مالی" value={fiscalYears.length} />
        <StatTile label="سال های باز" value={activeFiscalYearCount} />
        <StatTile label="تب های فعال" value={visibleTabCount} />
      </div>
      {defaultFiscalYear ? (
        <InlineAlert tone="info" title="سال مالی پیش فرض">
          <span className="font-black">{defaultFiscalYear.title}</span>
          <span className="mx-1">•</span>
          <span className="tabular-nums">{toShamsiDisplay(defaultFiscalYear.startDate)} تا {toShamsiDisplay(defaultFiscalYear.endDate)}</span>
        </InlineAlert>
      ) : null}
    </Card>
  )
}

function StatTile({ label, value }) {
  return (
    <Card padding="sm" className="space-y-1 border-[rgb(var(--ui-border-soft))]">
      <div className="text-[11px] font-black text-[rgb(var(--ui-text-muted))]">{label}</div>
      <div className="text-lg font-black text-[rgb(var(--ui-text))]">{value}</div>
    </Card>
  )
}

export function TabVisibilitySection({ tabs, visibility, saving, onToggle }) {
  return (
    <Card padding="md" className="space-y-3">
      <SectionHeader title="تب های فعال در میزکار حسابداری" description="تنها تب های لازم را برای کاربران فعال نگه دارید تا تجربه سریع تر و متمرکزتری داشته باشند." />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => {
          const enabled = visibility === null ? true : visibility[tab.id] !== false
          return (
            <label
              key={tab.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${enabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-500'}`}
            >
              <span>{tab.label}</span>
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={enabled}
                onChange={(e) => onToggle(tab.id, e.target.checked)}
                disabled={saving}
              />
            </label>
          )
        })}
      </div>
      {saving ? <FieldMessage>در حال ذخیره تنظیم تب ها...</FieldMessage> : null}
    </Card>
  )
}

export function BridgeMapSection({
  canWrite,
  mapError,
  mapSaved,
  mapSaving,
  fields,
  postableAccounts,
  onSave,
}) {
  if (!canWrite) return null

  return (
    <Card padding="md" className="space-y-3">
      <SectionHeader title="نگاشت حساب های پل فروش" description="حساب های مرتبط با روش های دریافت وجه را یک بار مشخص کنید تا ثبت اسناد پل فروش دقیق انجام شود." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(({ label, value, setter }) => (
          <FormField key={label} label={label}>
            <Select size="sm" value={value} onChange={(e) => setter(e.target.value)}>
              <option value="">-- انتخاب حساب --</option>
              {postableAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
            </Select>
          </FormField>
        ))}
      </div>
      {mapError ? <InlineAlert tone="danger">{mapError}</InlineAlert> : null}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onSave} disabled={mapSaving}>
          {mapSaving ? 'در حال ذخیره...' : 'ذخیره نگاشت حساب ها'}
        </Button>
        {mapSaved ? <Badge tone="success">ذخیره شد</Badge> : null}
      </div>
    </Card>
  )
}
