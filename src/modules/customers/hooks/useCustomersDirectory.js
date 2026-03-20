import { useCallback, useEffect, useState } from 'react'
import { customersApi } from '../services/customersApi'
import { normalizeCustomerRecord } from '../utils/customersView'

const DEFAULT_PAGINATION = { page: 1, pageSize: 25, total: 0 }

export const useCustomersDirectory = (filters) => {
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => setRefreshKey((value) => value + 1), [])

  useEffect(() => {
    let active = true

    const loadCustomers = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await customersApi.fetchCustomers({
          scope: 'directory',
          ...filters,
        })
        if (!active) return

        const list = Array.isArray(response?.customers) ? response.customers.map(normalizeCustomerRecord) : []
        setCustomers(list)
        setPagination({
          page: Number(response?.pagination?.page ?? filters?.page ?? 1),
          pageSize: Number(response?.pagination?.pageSize ?? filters?.pageSize ?? DEFAULT_PAGINATION.pageSize),
          total: Number(response?.pagination?.total ?? list.length ?? 0),
        })
      } catch (err) {
        if (!active) return
        setError(err?.message || 'دریافت مشتریان ناموفق بود.')
        setCustomers([])
        setPagination((prev) => ({ ...prev, total: 0 }))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadCustomers()
    return () => {
      active = false
    }
  }, [filters, refreshKey])

  return {
    customers,
    pagination,
    isLoading,
    error,
    setError,
    reload,
  }
}

