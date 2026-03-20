import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { humanResourcesApi } from '../services/humanResourcesApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { HumanResourcesWorkspace } from '../components/HumanResourcesWorkspace'

const EMPTY_FORM = {
  id: '',
  employeeCode: '',
  personnelNo: '',
  firstName: '',
  lastName: '',
  nationalId: '',
  mobile: '',
  department: '',
  jobTitle: '',
  bankName: '',
  bankAccountNo: '',
  bankSheba: '',
  baseSalary: '',
  notes: '',
  isActive: true,
}

const trimValue = (value) => String(value || '').trim()

function splitFullName(fullName = '') {
  const parts = trimValue(fullName).split(/\s+/).filter(Boolean)
  const firstName = parts.shift() || ''
  const lastName = parts.join(' ') || firstName
  return { firstName, lastName }
}

function toFormState(employee = {}) {
  const name = splitFullName(employee.fullName || '')
  return {
    ...EMPTY_FORM,
    id: String(employee.id || ''),
    employeeCode: trimValue(employee.employeeCode),
    personnelNo: trimValue(employee.personnelNo),
    firstName: trimValue(employee.firstName) || name.firstName,
    lastName: trimValue(employee.lastName) || name.lastName,
    nationalId: trimValue(employee.nationalId),
    mobile: trimValue(employee.mobile),
    department: trimValue(employee.department),
    jobTitle: trimValue(employee.jobTitle),
    bankName: trimValue(employee.bankName),
    bankAccountNo: trimValue(employee.bankAccountNo),
    bankSheba: trimValue(employee.bankSheba),
    baseSalary: String(employee.baseSalary ?? ''),
    notes: trimValue(employee.notes),
    isActive: employee.isActive !== false,
  }
}

export const HumanResourcesPage = ({ session }) => {
  const permissions = useMemo(() => (Array.isArray(session?.permissions) ? session.permissions : []), [session])
  const canAccessHumanResources = Boolean(session?.capabilities?.canAccessHumanResources)
  const canWriteEmployees = permissions.includes('human_resources.employees.write')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const debouncedQuery = useDebouncedValue(query, 300)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await humanResourcesApi.fetchEmployees({
        q: trimValue(debouncedQuery) || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'true',
      })
      setEmployees(Array.isArray(response?.employees) ? response.employees : [])
    } catch (loadError) {
      setError(loadError.message || 'بارگذاری پرسنل ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, statusFilter])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const onFormChange = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const onNewEmployee = () => {
    setForm(EMPTY_FORM)
    setFormError('')
  }

  const onEditEmployee = (employee) => {
    setForm(toFormState(employee))
    setFormError('')
  }

  const onSubmitForm = async (event) => {
    event.preventDefault()
    if (!canWriteEmployees) return

    const employeeCode = trimValue(form.employeeCode)
    const firstName = trimValue(form.firstName)
    const lastName = trimValue(form.lastName)
    if (!employeeCode || !firstName || !lastName) {
      setFormError('کد پرسنلی، نام و نام خانوادگی الزامی هستند.')
      return
    }

    const payload = {
      id: form.id || undefined,
      employeeCode,
      personnelNo: trimValue(form.personnelNo) || undefined,
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
      isActive: form.isActive !== false,
    }

    setBusyKey('save')
    setFormError('')
    try {
      if (form.id) {
        await humanResourcesApi.updateEmployee(payload)
      } else {
        await humanResourcesApi.createEmployee(payload)
      }
      setForm(EMPTY_FORM)
      await loadEmployees()
    } catch (saveError) {
      setFormError(saveError.message || 'ذخیره پرسنل ناموفق بود.')
    } finally {
      setBusyKey('')
    }
  }

  const onToggleEmployeeActive = async (employee) => {
    if (!canWriteEmployees) return
    setBusyKey(`toggle:${employee.id}`)
    setError('')
    try {
      await humanResourcesApi.setEmployeeActive(employee.id, !employee.isActive)
      await loadEmployees()
      if (String(form.id) === String(employee.id)) {
        setForm((current) => ({ ...current, isActive: !employee.isActive }))
      }
    } catch (toggleError) {
      setError(toggleError.message || 'تغییر وضعیت پرسنل ناموفق بود.')
    } finally {
      setBusyKey('')
    }
  }

  const onDeleteEmployee = async (employee) => {
    if (!canWriteEmployees) return
    const employeeName = employee?.fullName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'این پرسنل'
    const confirmed = window.confirm(`حذف ${employeeName} انجام شود؟`)
    if (!confirmed) return

    setBusyKey(`delete:${employee.id}`)
    setError('')
    try {
      await humanResourcesApi.deleteEmployee(employee.id)
      if (String(form.id) === String(employee.id)) {
        setForm(EMPTY_FORM)
      }
      await loadEmployees()
    } catch (deleteError) {
      setError(deleteError.message || 'حذف پرسنل ناموفق بود.')
    } finally {
      setBusyKey('')
    }
  }

  if (!canAccessHumanResources) {
    return <AccessDenied message="دسترسی کافی برای ماژول منابع انسانی وجود ندارد." />
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <HumanResourcesWorkspace
        busyKey={busyKey}
        canWriteEmployees={canWriteEmployees}
        employees={employees}
        error={error}
        form={form}
        formError={formError}
        loading={loading}
        onClearForm={onNewEmployee}
        onEditEmployee={onEditEmployee}
        onFormChange={onFormChange}
        onLoadEmployees={loadEmployees}
        onNewEmployee={onNewEmployee}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onSubmitForm={onSubmitForm}
        onDeleteEmployee={onDeleteEmployee}
        onToggleEmployeeActive={onToggleEmployeeActive}
        query={query}
        statusFilter={statusFilter}
      />
    </div>
  )
}
