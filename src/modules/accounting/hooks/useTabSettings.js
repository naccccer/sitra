import { useState, useEffect, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

// Tabs that can be shown/hidden via settings (core 'settings' and 'help' are always visible)
export const CONFIGURABLE_TABS = [
  { id: 'vouchers',        label: 'اسناد' },
  { id: 'accounts',        label: 'سرفصل حساب‌ها' },
  { id: 'trial_balance',   label: 'تراز آزمایشی' },
  { id: 'general_ledger',  label: 'دفتر کل' },
  { id: 'ar_summary',      label: 'مانده مشتریان' },
  { id: 'pnl',             label: 'درآمد/هزینه' },
  { id: 'bridge',          label: 'پل فروش' },
]

/**
 * Loads and saves tab visibility settings from system_settings.
 * `visibility` is a plain object: { tabId: true|false }
 * Missing keys default to true (visible).
 */
export function useTabSettings() {
  // null = not yet loaded, {} = all visible by default
  const [visibility, setVisibility] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await accountingApi.fetchTabVisibility()
      if (data?.value != null) {
        setVisibility(JSON.parse(data.value))
      } else {
        setVisibility({})
      }
    } catch {
      setVisibility({})
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isVisible = useCallback(
    (tabId) => {
      if (visibility === null) return true // while loading, show all
      if (!(tabId in visibility)) return true // default: visible
      return Boolean(visibility[tabId])
    },
    [visibility],
  )

  const save = useCallback(async (newVisibility) => {
    setSaving(true)
    try {
      await accountingApi.saveTabVisibility(newVisibility)
      setVisibility(newVisibility)
    } finally {
      setSaving(false)
    }
  }, [])

  return { visibility, isVisible, save, saving }
}
