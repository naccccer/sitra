import { useEffect, useMemo, useState } from 'react'
import { Button, Input } from '@/components/shared/ui'
import { normalizeCatalogItem } from './payrollCatalog'
import { PAYROLL_SOURCE_OPTIONS } from './payrollFormulaConfig'
import { PayrollSectionHeader } from './PayrollSectionHeader'
import { PayrollSettingsCatalogGroup } from './PayrollSettingsCatalogGroup'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'

function createNewCatalogItem() {
  const nonce = Date.now()
  return {
    key: `custom_${nonce}`,
    label: 'آیتم سفارشی',
    type: 'earning',
    source: `custom_${nonce}`,
    sortOrder: 999,
    active: true,
  }
}

function toSourceOption(item = {}) {
  const source = String(item.source || item.key || '').trim()
  const label = String(item.label || source).trim()
  if (!source || !label) return null
  return { value: source, label }
}

function buildFieldGroups(items = []) {
  const visibleItems = (Array.isArray(items) ? items : []).filter((item) => item.active !== false)
  const grouped = [
    { label: 'کارکرد و اطلاعات', options: visibleItems.filter((item) => item.type === 'work' || item.type === 'info').map(toSourceOption).filter(Boolean) },
    { label: 'دریافتی‌ها', options: visibleItems.filter((item) => item.type === 'earning').map(toSourceOption).filter(Boolean) },
    { label: 'کسورات', options: visibleItems.filter((item) => item.type === 'deduction').map(toSourceOption).filter(Boolean) },
  ]

  const dedupedGroups = []
  const used = new Set()
  grouped.forEach((group) => {
    const options = group.options.filter((option) => {
      if (!option?.value || used.has(option.value)) return false
      used.add(option.value)
      return true
    })
    if (options.length > 0) dedupedGroups.push({ label: group.label, options })
  })

  const baseOptions = PAYROLL_SOURCE_OPTIONS.filter((option) => option?.value && !used.has(option.value))
  if (baseOptions.length > 0) {
    dedupedGroups.push({ label: 'ورودی‌های پایه', options: baseOptions })
  }

  return dedupedGroups
}

function resolveFirstFieldValue(groups = []) {
  for (const group of groups) {
    for (const option of group.options || []) {
      if (option.value) return option.value
    }
  }
  return ''
}

export function PayrollSettingsPanel({ busy, canManage, onSave, settings }) {
  const [draft, setDraft] = useState(settings)
  const safeDraft = draft || {}

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const items = useMemo(
    () => (Array.isArray(safeDraft.payrollItemCatalog) ? safeDraft.payrollItemCatalog : []).map((item, index) => normalizeCatalogItem(item, index)),
    [safeDraft.payrollItemCatalog],
  )

  const grouped = useMemo(() => ({
    workInfo: items.filter((item) => item.type === 'work' || item.type === 'info'),
    earning: items.filter((item) => item.type === 'earning'),
    deduction: items.filter((item) => item.type === 'deduction'),
  }), [items])
  const fieldGroups = useMemo(() => buildFieldGroups(items), [items])
  const firstFieldValue = useMemo(() => resolveFirstFieldValue(fieldGroups), [fieldGroups])

  const patch = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const patchItem = (itemKey, nextLabel) => patch('payrollItemCatalog', items.map((item) => (item.key === itemKey ? { ...item, label: nextLabel } : item)))
  const patchItemConfig = (itemKey, nextPatch) => patch('payrollItemCatalog', items.map((item) => (item.key === itemKey ? { ...item, ...nextPatch } : item)))
  const removeItem = (itemKey) => patch('payrollItemCatalog', items.filter((item) => item.key !== itemKey))
  const addItem = (type) => patch('payrollItemCatalog', [...items, { ...createNewCatalogItem(), type }])

  return (
    <PayrollSurfaceCard density="spacious" className="space-y-4">
      <PayrollSurfaceCard className="space-y-2" tone="muted">
        <PayrollSectionHeader title="سربرگ و امضا" subtitle="اطلاعات شرکت و امضا در یک ردیف" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Input value={safeDraft.companyName || ''} onChange={(event) => patch('companyName', event.target.value)} placeholder="نام شرکت" />
          <Input value={safeDraft.companyId || ''} onChange={(event) => patch('companyId', event.target.value)} placeholder="شناسه / کد کارگاهی" />
          <Input value={safeDraft.signatoryName || ''} onChange={(event) => patch('signatoryName', event.target.value)} placeholder="نام امضاکننده" />
          <Input value={safeDraft.signatoryTitle || ''} onChange={(event) => patch('signatoryTitle', event.target.value)} placeholder="سمت امضاکننده" />
        </div>
      </PayrollSurfaceCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <PayrollSettingsCatalogGroup
          items={grouped.workInfo}
          canManage={canManage}
          fieldGroups={fieldGroups}
          firstFieldValue={firstFieldValue}
          onAdd={() => addItem('work')}
          onPatch={patchItem}
          onPatchConfig={patchItemConfig}
          onRemove={removeItem}
          title="کارکرد و اطلاعات"
        />
        <PayrollSettingsCatalogGroup
          items={grouped.earning}
          canManage={canManage}
          fieldGroups={fieldGroups}
          firstFieldValue={firstFieldValue}
          onAdd={() => addItem('earning')}
          onPatch={patchItem}
          onPatchConfig={patchItemConfig}
          onRemove={removeItem}
          title="دریافتی‌ها"
        />
        <PayrollSettingsCatalogGroup
          items={grouped.deduction}
          canManage={canManage}
          fieldGroups={fieldGroups}
          firstFieldValue={firstFieldValue}
          onAdd={() => addItem('deduction')}
          onPatch={patchItem}
          onPatchConfig={patchItemConfig}
          onRemove={removeItem}
          title="کسورات"
        />
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="primary"
          disabled={!canManage || busy}
          onClick={() => onSave({
            ...safeDraft,
            signatureLabel: 'امضا و تایید',
            signatureNote: '',
            payrollItemCatalog: items.map((item, index) => ({ ...item, active: true, sortOrder: index + 1 })),
          })}
        >
          {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </PayrollSurfaceCard>
  )
}
