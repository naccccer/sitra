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
  const [viewMode, setViewMode] = useState('active') // active | archived
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all')
  const [hasDueFilter, setHasDueFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formMode, setFormMode] = useState('create')
  const [formCustomer, setFormCustomer] = useState(null)
  const [detailsCustomer, setDetailsCustomer] = useState(null)
  const debouncedSearch = useDebouncedValue(searchInput, 350)

  const isArchiveView = viewMode === 'archived'

  const directoryFilters = useMemo(() => ({
    q: String(debouncedSearch || '').trim(),
    isActive: isArchiveView ? false : true,
    customerType: customerTypeFilter === 'all' ? undefined : customerTypeFilter,
    hasDue: hasDueFilter === 'all' ? undefined : hasDueFilter === 'true',
    page,
    pageSize,
  }), [debouncedSearch, isArchiveView, customerTypeFilter, hasDueFilter, page, pageSize])

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

  const handleViewChange = (mode) => {
    setViewMode(mode)
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

  const handleDeleteCustomer = async (customer) => {
    try {
      const nextCustomer = normalizeCustomerRecord(customer)
      await customersApi.archiveCustomer(Number(nextCustomer.id))
      await reload()
      setDetailsCustomer((prev) => {
        if (!prev || String(prev.id) !== String(nextCustomer.id)) return prev
        return { ...prev, isActive: false }
      })
    } catch (err) {
      setError(err?.message || 'حذف مشتری ناموفق بود.')
    }
  }

  const handleRestoreCustomer = async (customer) => {
    try {
      const nextCustomer = normalizeCustomerRecord(customer)
      await customersApi.restoreCustomer(Number(nextCustomer.id))
      await reload()
      setDetailsCustomer((prev) => {
        if (!prev || String(prev.id) !== String(nextCustomer.id)) return prev
        return { ...prev, isActive: true }
      })
    } catch (err) {
      setError(err?.message || 'بازگردانی مشتری ناموفق بود.')
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${!isArchiveView ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'}`}
            onClick={() => handleViewChange('active')}
          >
            فهرست مشتریان
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${isArchiveView ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-white'}`}
            onClick={() => handleViewChange('archived')}
          >
            آرشیو مشتریان
          </button>
        </div>
        {isArchiveView ? (
          <div className="rounded-full bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700">
            مشتریان حذف‌شده در این بخش بایگانی شده‌اند؛ با «بازیابی» می‌توانید آن‌ها را برگردانید.
          </div>
        ) : null}
      </div>

      <CustomersToolbar
        q={searchInput}
        onQueryChange={handleSearchChange}
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
        onDeleteCustomer={handleDeleteCustomer}
        onRestoreCustomer={handleRestoreCustomer}
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
