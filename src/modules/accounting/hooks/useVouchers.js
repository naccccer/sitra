import { useState, useEffect, useCallback } from 'react'
import { accountingApi } from '../services/accountingApi'

export function useVouchers(filters = {}) {
  const [vouchers, setVouchers] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await accountingApi.fetchVouchers(filters)
      setVouchers(data.vouchers ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { load() }, [load])

  return { vouchers, total, totalPages, loading, error, reload: load }
}
