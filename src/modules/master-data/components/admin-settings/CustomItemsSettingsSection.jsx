import React from 'react'
import { Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  IconButton,
  Input,
  Select,
} from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { CUSTOM_UNIT_LABEL_M_SQUARE, CUSTOM_UNIT_OPTIONS, normalizeCustomUnitLabel } from '@/utils/customItemUnits'
import { toPN } from '@/utils/helpers'
import { CardTitle, SettingsCard } from './SettingsUiParts'

const createCustomItem = () => ({
  id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: 'آیتم سفارشی جدید',
  unitLabel: CUSTOM_UNIT_LABEL_M_SQUARE,
  unitPrice: 0,
  isActive: true,
})

const updateItemAt = (items, index, patch) => items.map((item, idx) => (idx === index ? { ...item, ...patch } : item))

export const CustomItemsSettingsSection = ({ draft, setDraft }) => {
  const items = Array.isArray(draft.customItems) ? draft.customItems : []

  return (
    <div className="space-y-4">
      <SettingsCard>
        <CardTitle title="مدیریت آیتم‌های سفارشی" badge={`${toPN(items.length)} مورد`} />

        <DataTable minWidthClass="min-w-[760px]">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell align="center">حذف نرم</DataTableHeaderCell>
              <DataTableHeaderCell>عنوان آیتم</DataTableHeaderCell>
              <DataTableHeaderCell>واحد</DataTableHeaderCell>
              <DataTableHeaderCell align="center">قیمت واحد (تومان)</DataTableHeaderCell>
              <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {items.length === 0 ? (
              <DataTableState colSpan={5} title="هنوز آیتم سفارشی ثبت نشده است." />
            ) : items.map((item, index) => (
              <DataTableRow key={item.id} tone={item.isActive ? 'default' : 'muted'}>
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton
                      action="delete"
                      label="غیرفعال‌سازی"
                      tooltip="غیرفعال‌سازی"
                      onClick={() => {
                        const next = updateItemAt(items, index, { isActive: false })
                        setDraft((previous) => ({ ...previous, customItems: next }))
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </DataTableActions>
                </DataTableCell>
                <DataTableCell>
                  <Input
                    type="text"
                    value={item.title}
                    onChange={(event) => {
                      const next = updateItemAt(items, index, { title: event.target.value })
                      setDraft((previous) => ({ ...previous, customItems: next }))
                    }}
                    placeholder="عنوان آیتم سفارشی"
                    size="sm"
                    className="bg-white/90 text-xs"
                  />
                </DataTableCell>
                <DataTableCell>
                  <Select
                    value={normalizeCustomUnitLabel(item.unitLabel)}
                    onChange={(event) => {
                      const next = updateItemAt(items, index, { unitLabel: normalizeCustomUnitLabel(event.target.value) })
                      setDraft((previous) => ({ ...previous, customItems: next }))
                    }}
                    size="sm"
                    className="bg-white/90 text-xs"
                  >
                    {CUSTOM_UNIT_OPTIONS.map((option) => (
                      <option key={option.code} value={option.label}>{option.label}</option>
                    ))}
                  </Select>
                </DataTableCell>
                <DataTableCell align="center">
                  <div className="rounded-lg border border-slate-200 bg-white">
                    <PriceInput
                      value={item.unitPrice}
                      onChange={(value) => {
                        const next = updateItemAt(items, index, { unitPrice: Math.max(0, Number(value) || 0) })
                        setDraft((previous) => ({ ...previous, customItems: next }))
                      }}
                    />
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <button
                    type="button"
                    onClick={() => {
                      const next = updateItemAt(items, index, { isActive: !item.isActive })
                      setDraft((previous) => ({ ...previous, customItems: next }))
                    }}
                  >
                    <Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                  </button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>

        <Button
          action="create"
          showActionIcon
          variant="secondary"
          size="sm"
          onClick={() => setDraft((previous) => ({ ...previous, customItems: [...(previous.customItems || []), createCustomItem()] }))}
        >
          افزودن آیتم سفارشی
        </Button>
      </SettingsCard>
    </div>
  )
}
