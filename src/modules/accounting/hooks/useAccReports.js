import { useState, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

export function useAccReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const result = await accountingApi.fetchReport(filters)
      setData(result)
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetch }
}
