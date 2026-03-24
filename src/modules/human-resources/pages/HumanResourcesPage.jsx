import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { HumanResourcesWorkspace } from '../components/HumanResourcesWorkspace'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { humanResourcesApi } from '../services/humanResourcesApi'
import { EMPTY_FORM, toFormState, trimValue } from '../utils/humanResourcesView'

const HR_TABS = [{ id: 'personnel', label: 'پرسنل' }]

export const HumanResourcesPage = ({ session }) => {
  const permissions = useMemo(() => (Array.isArray(session?.permissions) ? session.permissions : []), [session])
  const canAccessHumanResources = Boolean(session?.capabilities?.canAccessHumanResources)
  const canWriteEmployees = permissions.includes('human_resources.employees.write')

  const [query, setQuery] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0 })
  const debouncedQuery = useDebouncedValue(query, 300)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await humanResourcesApi.fetchEmployees({
        q: trimValue(debouncedQuery) || undefined,
        isActive: archiveMode ? false : true,
        page,
        pageSize,
      })
      setEmployees(Array.isArray(response?.employees) ? response.employees : [])
      if (response?.pagination) {
        setPagination(response.pagination)
      }
    } catch (loadError) {
      setError(loadError.message || 'بارگذاری پرسنل ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [archiveMode, debouncedQuery, page, pageSize])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const onFormChange = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const onNewEmployee = useCallback(() => {
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }, [])

  const onEditEmployee = useCallback((employee) => {
    setForm(toFormState(employee))
    setFormError('')
    setModalOpen(true)
  }, [])

  const onCloseModal = useCallback(() => {
    setModalOpen(false)
    setFormError('')
    setForm(EMPTY_FORM)
  }, [])

  const onOpenImportModal = useCallback(() => {
    setImportModalOpen(true)
  }, [])

  const onCloseImportModal = useCallback(() => {
    setImportModalOpen(false)
  }, [])

  const onSubmitForm = async (event) => {
    event.preventDefault()
    if (!canWriteEmployees) return

    const firstName = trimValue(form.firstName)
    const lastName = trimValue(form.lastName)
    if (!firstName || !lastName) {
      setFormError('نام و نام خانوادگی الزامی هستند.')
      return
    }

    const payload = {
      id: form.id || undefined,
      employeeCode: form.id ? trimValue(form.employeeCode) || undefined : undefined,
      firstName,
      lastName,
      nationalId: trimValue(form.nationalId) || undefined,
      mobile: trimValue(form.mobile) || undefined,
      department: trimValue(form.department) || undefined,
      jobTitle: trimValue(form.jobTitle) || undefined,
      bankName: trimValue(form.bankName) || undefined,
      bankAccountNo: trimValue(form.bankAccountNo) || undefined,
      bankSheba: trimValue(form.bankSheba) || undefined,
      baseSalary: Number(form.baseSalary || 0),
      notes: trimValue(form.notes) || undefined,
      isActive: true,
    }

    setBusyKey('save')
    setFormError('')
    try {
      const response = form.id
        ? await humanResourcesApi.updateEmployee(payload)
        : await humanResourcesApi.createEmployee(payload)
      const savedEmployee = response?.employee || null
      await loadEmployees()
      if (form.id && savedEmployee?.id) {
        onEditEmployee(savedEmployee)
      } else {
        // New-employee mode keeps modal open but resets form for the next insert.
        setForm(EMPTY_FORM)
        setFormError('')
      }
    } catch (saveError) {
      setFormError(saveError.message || 'ذخیره پرسنل ناموفق بود.')
    } finally {
      setBusyKey('')
    }
  }

  const onToggleEmployeeActive = async (employee, nextIsActive, busyPrefix) => {
    if (!canWriteEmployees) return
    setBusyKey(`${busyPrefix}:${employee.id}`)
    setError('')
    try {
      await humanResourcesApi.setEmployeeActive(employee.id, nextIsActive)
      await loadEmployees()
      if (String(form.id) === String(employee.id) && modalOpen) onCloseModal()
    } catch (toggleError) {
      setError(toggleError.message || 'تغییر وضعیت پرسنل ناموفق بود.')
    } finally {
      setBusyKey('')
    }
  }

  const onArchiveEmployee = async (employee) => {
    if (!canWriteEmployees) return
    const employeeName = employee?.fullName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'این پرسنل'
    const employeeCode = trimValue(employee?.employeeCode)
    const confirmed = window.confirm(`پرسنل ${employeeName}${employeeCode ? ` با کد ${employeeCode}` : ''} به آرشیو منتقل شود؟`)
    if (!confirmed) return
    await onToggleEmployeeActive(employee, false, 'archive')
  }

  const onRestoreEmployee = async (employee) => {
    if (!canWriteEmployees) return
    await onToggleEmployeeActive(employee, true, 'restore')
  }

  const onArchiveModeToggle = useCallback(() => {
    setArchiveMode((current) => !current)
    setQuery('')
    setPage(1)
  }, [])

  const onQueryChange = useCallback((value) => {
    setQuery(value)
    setPage(1)
  }, [])

  const onPageSizeChange = useCallback((newSize) => {
    setPageSize(newSize)
    setPage(1)
  }, [])

  const onApplyImport = useCallback(async (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return
    setBusyKey('import')
    setError('')
    try {
      for (const row of rows) {
        const values = row?.values || {}
        const payload = {
          id: row?.employee?.id ? String(row.employee.id) : undefined,
          firstName: trimValue(values.firstName),
          lastName: trimValue(values.lastName),
          nationalId: trimValue(values.nationalId) || undefined,
          mobile: trimValue(values.mobile) || undefined,
          department: trimValue(values.department) || undefined,
          jobTitle: trimValue(values.jobTitle) || undefined,
          bankName: trimValue(values.bankName) || undefined,
          bankAccountNo: trimValue(values.bankAccountNo) || undefined,
          bankSheba: trimValue(values.bankSheba) || undefined,
          baseSalary: Number(values.baseSalary || 0),
          notes: trimValue(values.notes) || undefined,
        }
        if (payload.id) {
          await humanResourcesApi.updateEmployee(payload)
        } else {
          await humanResourcesApi.createEmployee(payload)
        }
      }
      await loadEmployees()
    } catch (importError) {
      setError(importError.message || 'درون‌ریزی اکسل ناموفق بود.')
      throw importError
    } finally {
      setBusyKey('')
    }
  }, [loadEmployees])

  if (!canAccessHumanResources) {
    return <AccessDenied message="دسترسی کافی برای ماژول منابع انسانی وجود ندارد." />
  }

  const selectedEmployee = form.id
    ? employees.find((employee) => String(employee.id) === String(form.id)) || null
    : null

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / Math.max(1, pageSize)))

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {HR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white transition-colors"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <HumanResourcesWorkspace
        archiveMode={archiveMode}
        busyKey={busyKey}
        canWriteEmployees={canWriteEmployees}
        employees={employees}
        error={error}
        form={form}
        formError={formError}
        importModalOpen={importModalOpen}
        loading={loading}
        modalOpen={modalOpen}
        onApplyImport={onApplyImport}
        onArchiveEmployee={onArchiveEmployee}
        onArchiveModeToggle={onArchiveModeToggle}
        onCloseImportModal={onCloseImportModal}
        onCloseModal={onCloseModal}
        onEditEmployee={onEditEmployee}
        onFormChange={onFormChange}
        onNewEmployee={onNewEmployee}
        onOpenImportModal={onOpenImportModal}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
        onQueryChange={onQueryChange}
        onReload={loadEmployees}
        onRestoreEmployee={onRestoreEmployee}
        onSubmitForm={onSubmitForm}
        page={page}
        pageSize={pageSize}
        query={query}
        selectedEmployee={selectedEmployee}
        totalCount={pagination.total || 0}
        totalPages={totalPages}
      />
    </div>
  )
}
