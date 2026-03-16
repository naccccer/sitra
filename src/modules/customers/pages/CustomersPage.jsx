import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card, Input } from '@/components/shared/ui'
import { customersApi } from '@/modules/customers/services/customersApi'

const toId = (value) => String(value || '')

export const CustomersPage = ({ session }) => {
  const canManageCustomers = Boolean(session?.capabilities?.canManageCustomers)
  const canWriteCustomers = Array.isArray(session?.permissions) && session.permissions.includes('customers.write')
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerDraft, setCustomerDraft] = useState({ fullName: '', defaultPhone: '' })
  const [projectDraft, setProjectDraft] = useState({ name: '' })
  const [contactDraft, setContactDraft] = useState({ label: 'main', phone: '', isPrimary: true })

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await customersApi.fetchCustomers({ page: 1, pageSize: 200 })
      const list = Array.isArray(response?.customers) ? response.customers : []
      setCustomers(list)
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(toId(list[0].id))
      }
    } catch (err) {
      setError(err?.message || 'دریافت مشتریان ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCustomerId])

  const loadProjects = useCallback(async (customerId) => {
    if (!customerId) {
      setProjects([])
      return
    }
    try {
      const response = await customersApi.fetchProjects(customerId)
      const list = Array.isArray(response?.projects) ? response.projects : []
      setProjects(list)
      if (list.length > 0) {
        setSelectedProjectId(toId(list[0].id))
      } else {
        setSelectedProjectId('')
        setContacts([])
      }
    } catch (err) {
      setError(err?.message || 'دریافت پروژه‌ها ناموفق بود.')
    }
  }, [])

  const loadContacts = useCallback(async (projectId) => {
    if (!projectId) {
      setContacts([])
      return
    }
    try {
      const response = await customersApi.fetchProjectContacts(projectId)
      const list = Array.isArray(response?.contacts) ? response.contacts : []
      setContacts(list)
    } catch (err) {
      setError(err?.message || 'دریافت شماره‌های پروژه ناموفق بود.')
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    void loadProjects(selectedCustomerId)
  }, [loadProjects, selectedCustomerId])

  useEffect(() => {
    void loadContacts(selectedProjectId)
  }, [loadContacts, selectedProjectId])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => toId(customer.id) === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  )
  if (!canManageCustomers) {
    return <AccessDenied message="دسترسی کافی برای بخش مشتریان وجود ندارد." />
  }

  const handleCreateCustomer = async () => {
    const fullName = String(customerDraft.fullName || '').trim()
    const defaultPhone = String(customerDraft.defaultPhone || '').trim()
    if (!fullName) {
      setError('نام مشتری الزامی است.')
      return
    }
    try {
      await customersApi.createCustomer({ fullName, defaultPhone })
      setCustomerDraft({ fullName: '', defaultPhone: '' })
      await loadCustomers()
    } catch (err) {
      setError(err?.message || 'ایجاد مشتری ناموفق بود.')
    }
  }

  const handleEditCustomer = async (customer) => {
    const nextFullName = window.prompt('نام مشتری', String(customer?.fullName || ''))
    if (nextFullName === null) return
    const nextPhone = window.prompt('تلفن پیش‌فرض مشتری', String(customer?.defaultPhone || ''))
    if (nextPhone === null) return
    const applyToOrderHistory = window.confirm('ویرایش نام/تلفن روی سفارش‌های قبلی همین مشتری هم اعمال شود؟')
    try {
      await customersApi.updateCustomer({
        id: Number(customer.id),
        fullName: nextFullName.trim(),
        defaultPhone: nextPhone.trim(),
        applyToOrderHistory,
      })
      await loadCustomers()
    } catch (err) {
      setError(err?.message || 'ویرایش مشتری ناموفق بود.')
    }
  }

  const handleToggleCustomer = async (customer) => {
    try {
      await customersApi.setCustomerActive(Number(customer.id), !customer.isActive)
      await loadCustomers()
    } catch (err) {
      setError(err?.message || 'تغییر وضعیت مشتری ناموفق بود.')
    }
  }

  const handleCreateProject = async () => {
    const name = String(projectDraft.name || '').trim()
    if (!selectedCustomerId) return
    if (!name) {
      setError('نام پروژه الزامی است.')
      return
    }
    try {
      await customersApi.createProject({
        customerId: Number(selectedCustomerId),
        name,
      })
      setProjectDraft({ name: '' })
      await loadProjects(selectedCustomerId)
    } catch (err) {
      setError(err?.message || 'ایجاد پروژه ناموفق بود.')
    }
  }

  const handleMoveProject = async (project) => {
    const targetCustomerId = window.prompt('شناسه مشتری مقصد', '')
    if (targetCustomerId === null) return
    const parsedTarget = Number(targetCustomerId)
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError('شناسه مشتری مقصد معتبر نیست.')
      return
    }
    try {
      await customersApi.updateProject({
        id: Number(project.id),
        targetCustomerId: parsedTarget,
        name: project.name,
      })
      await loadProjects(selectedCustomerId)
    } catch (err) {
      setError(err?.message || 'انتقال پروژه ناموفق بود.')
    }
  }

  const handleCreateContact = async () => {
    if (!selectedProjectId) return
    const phone = String(contactDraft.phone || '').trim()
    if (!phone) {
      setError('شماره تماس پروژه الزامی است.')
      return
    }
    try {
      await customersApi.createProjectContact({
        projectId: Number(selectedProjectId),
        label: String(contactDraft.label || 'main'),
        phone,
        isPrimary: Boolean(contactDraft.isPrimary),
      })
      setContactDraft({ label: 'main', phone: '', isPrimary: false })
      await loadContacts(selectedProjectId)
    } catch (err) {
      setError(err?.message || 'افزودن شماره پروژه ناموفق بود.')
    }
  }
  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="text-sm font-black text-slate-800">ایجاد مشتری</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input value={customerDraft.fullName} onChange={(event) => setCustomerDraft((p) => ({ ...p, fullName: event.target.value }))} placeholder="نام مشتری" />
          <Input value={customerDraft.defaultPhone} onChange={(event) => setCustomerDraft((p) => ({ ...p, defaultPhone: event.target.value }))} placeholder="تلفن پیش‌فرض (اختیاری)" dir="ltr" />
          <Button onClick={handleCreateCustomer} disabled={!canWriteCustomers}>ثبت مشتری</Button>
        </div>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md" className="space-y-2">
          <div className="text-sm font-black text-slate-800">مشتریان</div>
          {isLoading ? <div className="text-xs font-bold text-slate-500">در حال بارگذاری...</div> : null}
          <div className="space-y-2">
            {customers.map((customer) => (
              <div key={customer.id} className={`rounded-lg border px-2 py-2 ${toId(customer.id) === selectedCustomerId ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setSelectedCustomerId(toId(customer.id))} className="w-full text-start">
                  <div className="text-xs font-black text-slate-800">{customer.fullName}</div>
                  <div className="text-[11px] font-bold text-slate-500" dir="ltr">{customer.defaultPhone || '-'}</div>
                </button>
                {canWriteCustomers ? <div className="mt-2 flex gap-1"><Button size="sm" variant="secondary" onClick={() => handleEditCustomer(customer)}>ویرایش</Button><Button size="sm" variant={customer.isActive ? 'danger' : 'success'} onClick={() => handleToggleCustomer(customer)}>{customer.isActive ? 'غیرفعال' : 'فعال'}</Button></div> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="text-sm font-black text-slate-800">پروژه‌های مشتری</div>
          <div className="text-xs font-bold text-slate-500">{selectedCustomer ? selectedCustomer.fullName : 'مشتری انتخاب نشده'}</div>
          <div className="flex gap-2">
            <Input value={projectDraft.name} onChange={(event) => setProjectDraft({ name: event.target.value })} placeholder="نام پروژه جدید" />
            <Button onClick={handleCreateProject} disabled={!selectedCustomerId || !canWriteCustomers}>افزودن</Button>
          </div>
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className={`rounded-lg border px-2 py-2 ${toId(project.id) === selectedProjectId ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setSelectedProjectId(toId(project.id))} className="w-full text-start">
                  <div className="text-xs font-black text-slate-800">{project.name}{project.isDefault ? ' (پیش‌فرض)' : ''}</div>
                  <div className="text-[11px] font-bold text-slate-500">سفارش: {project.financialSummary?.ordersCount || 0} | مانده: {project.financialSummary?.dueAmount || 0}</div>
                </button>
                {canWriteCustomers ? <div className="mt-2 flex gap-1"><Button size="sm" variant="secondary" onClick={() => handleMoveProject(project)}>انتقال</Button><Button size="sm" variant={project.isActive ? 'danger' : 'success'} onClick={() => customersApi.setProjectActive(Number(project.id), !project.isActive).then(() => loadProjects(selectedCustomerId)).catch((err) => setError(err?.message || 'تغییر وضعیت پروژه ناموفق بود.'))}>{project.isActive ? 'غیرفعال' : 'فعال'}</Button></div> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="text-sm font-black text-slate-800">شماره‌های پروژه</div>
          <div className="grid grid-cols-1 gap-2">
            <Input value={contactDraft.label} onChange={(event) => setContactDraft((p) => ({ ...p, label: event.target.value }))} placeholder="برچسب (main/work/...)" />
            <Input value={contactDraft.phone} onChange={(event) => setContactDraft((p) => ({ ...p, phone: event.target.value }))} placeholder="شماره تماس پروژه" dir="ltr" />
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={contactDraft.isPrimary} onChange={(event) => setContactDraft((p) => ({ ...p, isPrimary: event.target.checked }))} />
              شماره اصلی پروژه
            </label>
            <Button onClick={handleCreateContact} disabled={!selectedProjectId || !canWriteCustomers}>افزودن شماره</Button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-lg border border-slate-200 px-2 py-2">
                <div className="text-xs font-black text-slate-800">{contact.label}{contact.isPrimary ? ' (اصلی)' : ''}</div>
                <div className="text-[11px] font-bold text-slate-500" dir="ltr">{contact.phone}</div>
                {canWriteCustomers ? (
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const nextPhone = window.prompt('شماره تماس پروژه', String(contact.phone || ''))
                        if (nextPhone === null) return
                        await customersApi.updateProjectContact({ id: Number(contact.id), phone: nextPhone.trim(), label: contact.label, isPrimary: contact.isPrimary, projectId: Number(contact.projectId) })
                        await loadContacts(selectedProjectId)
                      }}
                    >
                      ویرایش
                    </Button>
                    <Button size="sm" variant={contact.isActive ? 'danger' : 'success'} onClick={() => customersApi.setProjectContactActive(Number(contact.id), !contact.isActive).then(() => loadContacts(selectedProjectId)).catch((err) => setError(err?.message || 'تغییر وضعیت شماره ناموفق بود.'))}>
                      {contact.isActive ? 'غیرفعال' : 'فعال'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
