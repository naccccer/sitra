import { useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button } from '@/components/shared/ui'
import { CustomerDetailsModal } from '../components/CustomerDetailsModal'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { CustomersTable } from '../components/CustomersTable'
import { CustomersToolbar } from '../components/CustomersToolbar'
import { useCustomersDirectory } from '../hooks/useCustomersDirectory'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { customersApi } from '../services/customersApi'
import { createCustomerDraft, normalizeCustomerRecord } from '../utils/customersView'

export const CustomersPage = ({ session }) => {
  const canManageCustomers = Boolean(session?.capabilities?.canManageCustomers)
  const canWriteCustomers = Array.isArray(session?.permissions) && session.permissions.includes('customers.write')

  const [searchInput, setSearchInput] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all')
  const [hasDueFilter, setHasDueFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formMode, setFormMode] = useState('create')
  const [formCustomer, setFormCustomer] = useState(null)
  const [detailsCustomer, setDetailsCustomer] = useState(null)
  const debouncedSearch = useDebouncedValue(searchInput, 350)

  const directoryFilters = useMemo(() => ({
    q: String(debouncedSearch || '').trim(),
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'true',
    customerType: customerTypeFilter === 'all' ? undefined : customerTypeFilter,
    hasDue: hasDueFilter === 'all' ? undefined : hasDueFilter === 'true',
    page,
    pageSize,
  }), [debouncedSearch, isActiveFilter, customerTypeFilter, hasDueFilter, page, pageSize])

  const {
    customers,
    pagination,
    isLoading,
    error,
    setError,
    reload,
  } = useCustomersDirectory(directoryFilters)

  if (!canManageCustomers) {
    return <AccessDenied message="دسترسی کافی برای بخش مشتریان وجود ندارد." />
  }

  const handleSearchChange = (value) => {
    setSearchInput(value)
    setPage(1)
  }

  const handleIsActiveChange = (value) => {
    setIsActiveFilter(value)
    setPage(1)
  }

  const handleCustomerTypeChange = (value) => {
    setCustomerTypeFilter(value)
    setPage(1)
  }

  const handleHasDueChange = (value) => {
    setHasDueFilter(value)
    setPage(1)
  }

  const handlePageSizeChange = (value) => {
    setPageSize(value)
    setPage(1)
  }

  const handleCreateCustomer = () => {
    setFormMode('create')
    setFormCustomer(createCustomerDraft())
    setDetailsCustomer(null)
  }

  const handleEditCustomer = (customer) => {
    setFormMode('edit')
    setFormCustomer(normalizeCustomerRecord(customer))
    setDetailsCustomer(null)
  }

  const handleOpenDetails = (customer) => {
    setDetailsCustomer(normalizeCustomerRecord(customer))
  }

  const handleToggleCustomer = async (customer) => {
    try {
      const nextCustomer = normalizeCustomerRecord(customer)
      await customersApi.setCustomerActive(Number(nextCustomer.id), !nextCustomer.isActive)
      await reload()
      setDetailsCustomer((prev) => {
        if (!prev || String(prev.id) !== String(nextCustomer.id)) return prev
        return { ...prev, isActive: !nextCustomer.isActive }
      })
    } catch (err) {
      setError(err?.message || 'تغییر وضعیت مشتری ناموفق بود.')
    }
  }

  const handleFormSaved = async (savedCustomer) => {
    setFormCustomer(null)
    setFormMode('create')
    await reload()
    if (savedCustomer) {
      setDetailsCustomer(normalizeCustomerRecord(savedCustomer))
    }
  }

  const activeRowId = String(detailsCustomer?.id || formCustomer?.id || '')
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / Math.max(1, pagination.pageSize || pageSize)))

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <CustomersToolbar
        q={searchInput}
        onQueryChange={handleSearchChange}
        isActive={isActiveFilter}
        onIsActiveChange={handleIsActiveChange}
        customerType={customerTypeFilter}
        onCustomerTypeChange={handleCustomerTypeChange}
        hasDue={hasDueFilter}
        onHasDueChange={handleHasDueChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        total={pagination.total || 0}
        onCreateCustomer={handleCreateCustomer}
        canWriteCustomers={canWriteCustomers}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">
          {error}
          <button type="button" className="ms-3 underline" onClick={() => setError('')}>بستن</button>
        </div>
      ) : null}

      <CustomersTable
        customers={customers}
        isLoading={isLoading}
        selectedCustomerId={activeRowId}
        canWriteCustomers={canWriteCustomers}
        onOpenDetails={handleOpenDetails}
        onEditCustomer={handleEditCustomer}
        onToggleActive={handleToggleCustomer}
      />

      {!isLoading && customers.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            صفحه {pagination.page} از {totalPages} - {pagination.total || 0} نتیجه
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</Button>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">{page}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>بعدی</Button>
          </div>
        </div>
      ) : null}

      <CustomerFormModal
        isOpen={Boolean(formCustomer)}
        mode={formMode}
        customer={formCustomer}
        canWriteCustomers={canWriteCustomers}
        onClose={() => setFormCustomer(null)}
        onSaved={handleFormSaved}
      />

      <CustomerDetailsModal
        isOpen={Boolean(detailsCustomer)}
        customer={detailsCustomer}
        canWriteCustomers={canWriteCustomers}
        onClose={() => setDetailsCustomer(null)}
        onEditCustomer={handleEditCustomer}
        onReloadCustomerList={reload}
      />
    </div>
  )
}
