import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, ModalShell } from '@/components/shared/ui'
import { customersApi } from '../services/customersApi'
import { createContactDraft, createProjectDraft, formatAmount, formatDateTime, formatLocation, normalizeCustomerRecord, customerTypeLabel, toPN } from '../utils/customersView'
import { CustomerDetailsContactsTab } from './customer-details/CustomerDetailsContactsTab'
import { CustomerDetailsFinancialTab } from './customer-details/CustomerDetailsFinancialTab'
import { CustomerDetailsProfileTab } from './customer-details/CustomerDetailsProfileTab'
import { CustomerDetailsProjectsTab } from './customer-details/CustomerDetailsProjectsTab'

const TABS = [
  { id: 'profile', label: 'پروفایل' },
  { id: 'projects', label: 'پروژه‌ها' },
  { id: 'contacts', label: 'شماره‌ها' },
  { id: 'financial', label: 'مالی' },
]

const toId = (value) => String(value ?? '')
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

export const CustomerDetailsModal = ({
  isOpen,
  customer,
  canWriteCustomers = false,
  onClose,
  onEditCustomer,
  onReloadCustomerList,
}) => {
  const normalizedCustomer = useMemo(() => normalizeCustomerRecord(customer || {}), [customer])
  const [activeTab, setActiveTab] = useState('profile')
  const [projects, setProjects] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDraft, setProjectDraft] = useState(createProjectDraft(null, normalizedCustomer.id))
  const [contactDraft, setContactDraft] = useState(createContactDraft(null, ''))
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [error, setError] = useState('')

  const loadProjects = useCallback(async () => {
    if (!normalizedCustomer.id) return
    setIsLoadingProjects(true)
    setError('')
    try {
      const response = await customersApi.fetchProjects(Number(normalizedCustomer.id))
      const list = Array.isArray(response?.projects) ? response.projects : []
      setProjects(list)
      const defaultProject = list.find((item) => Boolean(item.isDefault)) || list[0] || null
      if (defaultProject) {
        setSelectedProjectId(toId(defaultProject.id))
        setProjectDraft(createProjectDraft(defaultProject, normalizedCustomer.id))
        setContactDraft(createContactDraft(null, toId(defaultProject.id)))
      } else {
        setSelectedProjectId('')
        setProjectDraft(createProjectDraft(null, normalizedCustomer.id))
        setContacts([])
      }
    } catch (err) {
      setError(err?.message || 'دریافت پروژه‌ها ناموفق بود.')
    } finally {
      setIsLoadingProjects(false)
    }
  }, [normalizedCustomer.id])

  const loadContacts = useCallback(async (projectId) => {
    if (!projectId) {
      setContacts([])
      return
    }
    setIsLoadingContacts(true)
    setError('')
    try {
      const response = await customersApi.fetchProjectContacts(Number(projectId))
      setContacts(Array.isArray(response?.contacts) ? response.contacts : [])
    } catch (err) {
      setError(err?.message || 'دریافت شماره‌ها ناموفق بود.')
    } finally {
      setIsLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('profile')
    setError('')
    setProjects([])
    setContacts([])
    setSelectedProjectId('')
    setProjectDraft(createProjectDraft(null, normalizedCustomer.id))
    setContactDraft(createContactDraft(null, ''))
    void loadProjects()
  }, [isOpen, loadProjects, normalizedCustomer.id])

  useEffect(() => {
    if (!isOpen || !selectedProjectId) return
    const project = projects.find((item) => toId(item.id) === selectedProjectId) || null
    if (project) setProjectDraft(createProjectDraft(project, normalizedCustomer.id))
    setContactDraft(createContactDraft(null, selectedProjectId))
    void loadContacts(selectedProjectId)
  }, [isOpen, loadContacts, normalizedCustomer.id, projects, selectedProjectId])

  const handleSaveProject = async () => {
    if (!canWriteCustomers) return
    const name = String(projectDraft.name || '').trim()
    if (!name) {
      setError('نام پروژه الزامی است.')
      return
    }

    try {
      const payload = {
        id: projectDraft.id ? Number(projectDraft.id) : undefined,
        customerId: Number(projectDraft.targetCustomerId || normalizedCustomer.id),
        targetCustomerId: Number(projectDraft.targetCustomerId || normalizedCustomer.id),
        name,
        notes: String(projectDraft.notes || '').trim(),
        isDefault: Boolean(projectDraft.isDefault),
      }

      if (projectDraft.id) {
        await customersApi.updateProject(payload)
      } else {
        await customersApi.createProject(payload)
      }

      await loadProjects()
      await onReloadCustomerList?.()
    } catch (err) {
      setError(err?.message || 'ذخیره پروژه ناموفق بود.')
    }
  }

  const handleToggleProject = async (project) => {
    if (!canWriteCustomers) return
    try {
      await customersApi.setProjectActive(Number(project.id), !project.isActive)
      await loadProjects()
      await onReloadCustomerList?.()
    } catch (err) {
      setError(err?.message || 'تغییر وضعیت پروژه ناموفق بود.')
    }
  }

  const handleSaveContact = async () => {
    if (!canWriteCustomers) return
    const phone = String(contactDraft.phone || '').trim()
    if (!selectedProjectId) {
      setError('ابتدا یک پروژه انتخاب کنید.')
      return
    }
    if (!phone) {
      setError('شماره تماس الزامی است.')
      return
    }

    try {
      const payload = {
        id: contactDraft.id ? Number(contactDraft.id) : undefined,
        projectId: Number(selectedProjectId),
        label: String(contactDraft.label || 'main').trim() || 'main',
        phone,
        sortOrder: Number(contactDraft.sortOrder || 100),
        isPrimary: Boolean(contactDraft.isPrimary),
      }

      if (contactDraft.id) {
        await customersApi.updateProjectContact(payload)
      } else {
        await customersApi.createProjectContact(payload)
      }

      await loadContacts(selectedProjectId)
      await loadProjects()
      await onReloadCustomerList?.()
      setContactDraft(createContactDraft(null, selectedProjectId))
    } catch (err) {
      setError(err?.message || 'ذخیره شماره ناموفق بود.')
    }
  }

  const handleToggleContact = async (contact) => {
    if (!canWriteCustomers) return
    try {
      await customersApi.setProjectContactActive(Number(contact.id), !contact.isActive)
      await loadContacts(selectedProjectId)
      await loadProjects()
      await onReloadCustomerList?.()
    } catch (err) {
      setError(err?.message || 'تغییر وضعیت شماره ناموفق بود.')
    }
  }

  const profileRows = [
    ['کد مشتری', normalizedCustomer.customerCode ? toPersianDigits(normalizedCustomer.customerCode) : '-'],
    ['نوع', customerTypeLabel(normalizedCustomer.customerType)],
    ['نام', normalizedCustomer.fullName || '-'],
    ['نام شرکت', normalizedCustomer.companyName || '-'],
    ['تلفن پیش‌فرض', normalizedCustomer.defaultPhone ? toPersianDigits(normalizedCustomer.defaultPhone) : '-'],
    ['ایمیل', normalizedCustomer.email || '-'],
    ['شناسه ملی', normalizedCustomer.nationalId ? toPersianDigits(normalizedCustomer.nationalId) : '-'],
    ['کد اقتصادی', normalizedCustomer.economicCode ? toPersianDigits(normalizedCustomer.economicCode) : '-'],
    ['موقعیت', formatLocation(normalizedCustomer.province, normalizedCustomer.city)],
    ['آدرس', normalizedCustomer.address || '-'],
    ['سقف اعتبار', normalizedCustomer.creditLimit ? formatAmount(normalizedCustomer.creditLimit) : '-'],
    ['مهلت پرداخت', normalizedCustomer.paymentTermDays ? `${toPN(normalizedCustomer.paymentTermDays)} روز` : '-'],
  ]

  const profileCustomer = useMemo(
    () => ({
      ...normalizedCustomer,
      updatedAt: formatDateTime(normalizedCustomer.updatedAt),
    }),
    [normalizedCustomer],
  )

  return (
    <ModalShell
      isOpen={isOpen}
      title={`جزئیات مشتری: ${normalizedCustomer.fullName || '-'}`}
      description="پروفایل، پروژه‌ها، شماره‌ها و جمع‌بندی مالی در یک پنجره."
      onClose={onClose}
      maxWidthClass="max-w-6xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold text-slate-500">{error || ' '}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>بستن</Button>
            {canWriteCustomers ? <Button variant="primary" onClick={() => onEditCustomer?.(normalizedCustomer)}>ویرایش مشتری</Button> : null}
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? <CustomerDetailsProfileTab customer={profileCustomer} profileRows={profileRows} /> : null}
      {activeTab === 'projects' ? (
        <CustomerDetailsProjectsTab
          projects={projects}
          isLoadingProjects={isLoadingProjects}
          selectedProjectId={selectedProjectId}
          projectDraft={projectDraft}
          setProjectDraft={setProjectDraft}
          canWriteCustomers={canWriteCustomers}
          resetProjectDraft={(project = null) => {
            setProjectDraft(createProjectDraft(project, normalizedCustomer.id))
            setSelectedProjectId(project ? toId(project.id) : '')
          }}
          handleSaveProject={handleSaveProject}
          handleToggleProject={handleToggleProject}
        />
      ) : null}
      {activeTab === 'contacts' ? (
        <CustomerDetailsContactsTab
          projects={projects}
          contacts={contacts}
          isLoadingContacts={isLoadingContacts}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          contactDraft={contactDraft}
          setContactDraft={setContactDraft}
          canWriteCustomers={canWriteCustomers}
          resetContactDraft={(contact = null, projectId = selectedProjectId) => setContactDraft(createContactDraft(contact, projectId))}
          handleSaveContact={handleSaveContact}
          handleToggleContact={handleToggleContact}
        />
      ) : null}
      {activeTab === 'financial' ? (
        <CustomerDetailsFinancialTab customer={normalizedCustomer} projects={projects} />
      ) : null}
    </ModalShell>
  )
}
