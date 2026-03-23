import { useState, useEffect, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

export function useFiscalYears() {
  const [fiscalYears, setFiscalYears] = useState([])
  const [currentDefault, setCurrentDefault] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await accountingApi.fetchFiscalYears()
      setFiscalYears(data.fiscalYears ?? [])
      setCurrentDefault(data.currentDefault ?? null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { fiscalYears, currentDefault, loading, error, reload: load }
}
