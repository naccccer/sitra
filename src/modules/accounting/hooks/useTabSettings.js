import { useState, useEffect, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

export const CONFIGURABLE_TABS = [
  { id: 'vouchers', label: 'اسناد' },
  { id: 'accounts', label: 'سرفصل حساب ها' },
  { id: 'trial_balance', label: 'تراز آزمایشی' },
  { id: 'general_ledger', label: 'دفتر کل' },
  { id: 'ar_summary', label: 'مانده مشتریان' },
  { id: 'pnl', label: 'درآمد/هزینه' },
  { id: 'bridge', label: 'پل فروش' },
  { id: 'payroll', label: 'حقوق و دستمزد' },
]

export function useTabSettings() {
  const [visibility, setVisibility] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await accountingApi.fetchTabVisibility()
      setVisibility(data?.value != null ? JSON.parse(data.value) : {})
    } catch {
      setVisibility({})
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isVisible = useCallback((tabId) => {
    if (visibility === null) return true
    if (!(tabId in visibility)) return true
    return Boolean(visibility[tabId])
  }, [visibility])

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
