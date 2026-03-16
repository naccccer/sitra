import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input, Select } from '@/components/shared/ui'
import {
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_UNIT_OPTIONS,
} from '@/modules/inventory/constants/inventoryDefaults'

const UNIT_LABEL_MAP = INVENTORY_UNIT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

export const InventoryItemsPanel = ({ items = [], canWrite = false, onCreate, onUpdate, onToggleActive }) => {
  const [draft, setDraft] = useState({
    title: '',
    category: 'raw_glass',
    baseUnit: 'sheet',
    secondaryUnit: 'm2',
    secondaryPerBase: '1',
    glassWidthMm: '',
    glassHeightMm: '',
    glassThicknessMm: '',
    glassColor: '',
  })
  const [error, setError] = useState('')

  const visibleItems = useMemo(() => [...items].slice(0, 80), [items])
  const isRawGlass = draft.category === 'raw_glass'
  const hasSecondaryUnit = Boolean(draft.secondaryUnit)

  const handleCreate = async () => {
    setError('')
    if (!canWrite) return
    if (!String(draft.title || '').trim()) {
      setError('عنوان کالا الزامی است.')
      return
    }

    try {
      await onCreate({
        ...draft,
        secondaryPerBase: draft.secondaryUnit ? Number(draft.secondaryPerBase || 0) : null,
      })
      setDraft((prev) => ({
        ...prev,
        title: '',
        glassWidthMm: '',
        glassHeightMm: '',
        glassThicknessMm: '',
        glassColor: '',
      }))
    } catch (e) {
      setError(e?.message || 'ثبت کالا ناموفق بود.')
    }
  }

  const handleQuickEditTitle = async (item) => {
    if (!canWrite) return
    const title = window.prompt('عنوان کالا', String(item?.title || ''))
    if (title === null) return
    try {
      await onUpdate({
        id: Number(item.id),
        ...item,
        title: String(title || '').trim(),
      })
    } catch (e) {
      setError(e?.message || 'ویرایش کالا ناموفق بود.')
    }
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-800">تعریف کالاهای انبار</div>

      {canWrite && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="عنوان کالا" />
          <Select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}>
            {INVENTORY_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select value={draft.baseUnit} onChange={(e) => setDraft((p) => ({ ...p, baseUnit: e.target.value }))}>
            {INVENTORY_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select
            value={draft.secondaryUnit}
            onChange={(e) => setDraft((p) => ({
              ...p,
              secondaryUnit: e.target.value,
              secondaryPerBase: e.target.value ? (p.secondaryPerBase || '1') : '',
            }))}
          >
            <option value="">بدون واحد دوم</option>
            {INVENTORY_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          {hasSecondaryUnit && (
            <Input value={draft.secondaryPerBase} onChange={(e) => setDraft((p) => ({ ...p, secondaryPerBase: e.target.value }))} placeholder="نسبت واحد دوم به پایه" dir="ltr" />
          )}

          {isRawGlass && (
            <>
              <Input value={draft.glassWidthMm} onChange={(e) => setDraft((p) => ({ ...p, glassWidthMm: e.target.value }))} placeholder="عرض (میلی متر)" dir="ltr" />
              <Input value={draft.glassHeightMm} onChange={(e) => setDraft((p) => ({ ...p, glassHeightMm: e.target.value }))} placeholder="ارتفاع (میلی متر)" dir="ltr" />
              <Input value={draft.glassThicknessMm} onChange={(e) => setDraft((p) => ({ ...p, glassThicknessMm: e.target.value }))} placeholder="ضخامت (میلی متر)" dir="ltr" />
              <Input value={draft.glassColor} onChange={(e) => setDraft((p) => ({ ...p, glassColor: e.target.value }))} placeholder="رنگ" />
            </>
          )}

          <div className="md:col-span-4">
            <Button onClick={handleCreate}>ثبت کالا</Button>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}

      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-black text-slate-800">{item.title}</div>
              <div className="text-[11px] font-bold text-slate-500" dir="ltr">
                {item.category} | {UNIT_LABEL_MAP[item.baseUnit] || item.baseUnit}
                {item.secondaryUnit ? ` / ${UNIT_LABEL_MAP[item.secondaryUnit] || item.secondaryUnit}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {item.isActive ? <Badge tone="success">فعال</Badge> : <Badge tone="neutral">غیرفعال</Badge>}
              {canWrite && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => handleQuickEditTitle(item)}>ویرایش</Button>
                  <Button size="sm" variant={item.isActive ? 'danger' : 'success'} onClick={() => onToggleActive(Number(item.id), !item.isActive)}>
                    {item.isActive ? 'غیرفعال' : 'فعال'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
