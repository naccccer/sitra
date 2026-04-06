import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, InlineAlert } from '@/components/shared/ui'
import { DEFAULT_UOM_OPTIONS, normalizeUomOptions } from '@/modules/inventory/config/uomOptions'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

export const InventoryUomSettingsPanel = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const canWrite = permissions.includes('inventory.v2_settings.write')

  const [selected, setSelected] = useState(DEFAULT_UOM_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    inventoryApi.fetchV2Settings('uom_options')
      .then((response) => {
        if (!mounted) return
        const configured = normalizeUomOptions(response?.value)
        setSelected(configured.length > 0 ? configured : DEFAULT_UOM_OPTIONS)
      })
      .catch((loadError) => {
        if (!mounted) return
        setError(loadError?.message || 'بارگذاری تنظیمات واحدها ناموفق بود.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggleOption = (uom) => {
    if (!canWrite || saving) return
    setSuccess('')
    setSelected((prev) => (
      prev.includes(uom) ? prev.filter((item) => item !== uom) : [...prev, uom]
    ))
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    if (selected.length === 0) {
      setError('حداقل یک واحد باید فعال باشد.')
      return
    }
    setSaving(true)
    try {
      await inventoryApi.saveV2Settings('uom_options', selected)
      setSuccess('تنظیمات واحدهای اندازه‌گیری ذخیره شد.')
    } catch (saveError) {
      setError(saveError?.message || 'ذخیره تنظیمات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div>
          <div className="text-sm font-black text-slate-800">واحدهای قابل نمایش</div>
          <div className="mt-1 text-xs text-slate-500">مشخص کنید در فرم‌های انبار چه واحدهایی قابل انتخاب باشند.</div>
        </div>
        <Badge tone="neutral">انتخاب‌شده: {selected.length}</Badge>
      </div>

      {error ? <InlineAlert tone="danger" title="خطا">{error}</InlineAlert> : null}
      {success ? <InlineAlert tone="success" title="ذخیره شد">{success}</InlineAlert> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {DEFAULT_UOM_OPTIONS.map((uom) => {
          const isChecked = selectedSet.has(uom)
          return (
            <button
              type="button"
              key={uom}
              onClick={() => toggleOption(uom)}
              disabled={!canWrite || saving || loading}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                isChecked
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              } ${(!canWrite || saving || loading) ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              {uom}
            </button>
          )
        })}
      </div>

      {canWrite ? (
        <div className="flex justify-start" dir="ltr">
          <Button action="save" showActionIcon onClick={handleSave} disabled={saving || loading}>
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
