import { useState, useEffect, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

export function useAccounts(filters = {}) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await accountingApi.fetchAccounts(filters)
      setAccounts(data.accounts ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { load() }, [load])

  return { accounts, loading, error, reload: load }
}

export function usePostableAccounts() {
  return useAccounts({ postableOnly: true })
}
