import { useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { InlineAlert, WorkspaceShellTemplate } from '@/components/shared/ui'
import { CustomerDetailsModal } from '../components/CustomerDetailsModal'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { CustomersDirectoryPanel } from '../components/CustomersDirectoryPanel'
import { useCustomersDirectory } from '../hooks/useCustomersDirectory'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { customersApi } from '../services/customersApi'
import { createCustomerDraft, normalizeCustomerRecord } from '../utils/customersView'

export const CustomersPage = ({ session }) => {
  const canManageCustomers = Boolean(session?.capabilities?.canManageCustomers)
  const canWriteCustomers = Array.isArray(session?.permissions) && session.permissions.includes('customers.write')

  const [searchInput, setSearchInput] = useState('')
  const [viewMode, setViewMode] = useState('active') // active | archived
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formCustomer, setFormCustomer] = useState(null)
  const [detailsCustomer, setDetailsCustomer] = useState(null)
  const debouncedSearch = useDebouncedValue(searchInput, 350)

  const isArchiveView = viewMode === 'archived'

  const directoryFilters = useMemo(() => ({
    q: String(debouncedSearch || '').trim(),
    isActive: isArchiveView ? false : true,
    page,
    pageSize,
  }), [debouncedSearch, isArchiveView, page, pageSize])

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

  const handleViewChange = () => {
    setViewMode((prev) => (prev === 'active' ? 'archived' : 'active'))
    setPage(1)
  }

  const handlePageSizeChange = (value) => {
    setPageSize(value)
    setPage(1)
  }

  const handleCreateCustomer = () => {
    setFormCustomer(createCustomerDraft())
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
    await reload()
    if (savedCustomer) {
      setDetailsCustomer(normalizeCustomerRecord(savedCustomer))
    }
  }

  const activeRowId = String(detailsCustomer?.id || formCustomer?.id || '')
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / Math.max(1, pagination.pageSize || pageSize)))

  return (
    <WorkspaceShellTemplate
<<<<<<< ours
<<<<<<< ours
=======
      showHeader={false}
>>>>>>> theirs
=======
      showHeader={false}
>>>>>>> theirs
      eyebrow="مشتریان"
      title="دایرکتوری مشتریان"
      description="جستجو، مشاهده جزئیات، و مدیریت وضعیت فعال/آرشیو با الگوی یکپارچه." 
    >
      {error ? (
        <InlineAlert tone="danger" title="خطا" actions={<button type="button" className="underline" onClick={() => setError('')}>بستن</button>}>
          {error}
        </InlineAlert>
      ) : null}

      <CustomersDirectoryPanel
        archiveMode={isArchiveView}
        canWriteCustomers={canWriteCustomers}
        customers={customers}
        loading={isLoading}
        onArchiveModeToggle={handleViewChange}
        onCreateCustomer={handleCreateCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onOpenDetails={handleOpenDetails}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onQueryChange={handleSearchChange}
        onReload={reload}
        onRestoreCustomer={handleRestoreCustomer}
        page={page}
        pageSize={pageSize}
        query={searchInput}
        selectedCustomerId={activeRowId}
        totalCount={pagination.total || 0}
        totalPages={totalPages}
      />

      <CustomerFormModal
        isOpen={Boolean(formCustomer)}
        mode="create"
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
        onReloadCustomerList={reload}
      />
    </WorkspaceShellTemplate>
  )
}
