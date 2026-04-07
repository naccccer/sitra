import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, ModalShell } from '@/components/shared/ui'
import { customersApi } from '../services/customersApi'
import { createCustomerDraft, createProjectDraft, formatDateTime, normalizeCustomerRecord } from '../utils/customersView'
import { DETAILS_TABS, toId, toNullableNumber } from './customer-details/customerDetailsHelpers'
import { CustomerDetailsFinancialTab } from './customer-details/CustomerDetailsFinancialTab'
import { CustomerDetailsProfileTab } from './customer-details/CustomerDetailsProfileTab'
import { CustomerDetailsProjectsTab } from './customer-details/CustomerDetailsProjectsTab'
export const CustomerDetailsModal = ({
  isOpen,
  customer,
  canWriteCustomers = false,
  onClose,
  onReloadCustomerList,
}) => {
  const normalizedCustomer = useMemo(() => normalizeCustomerRecord(customer || {}), [customer])
  const [editableCustomer, setEditableCustomer] = useState(normalizedCustomer)
  const [editDraft, setEditDraft] = useState(createCustomerDraft(normalizedCustomer))
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [projects, setProjects] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDraft, setProjectDraft] = useState(createProjectDraft(null, normalizedCustomer.id))
  const [projectPhoneDraft, setProjectPhoneDraft] = useState('')
  const [projectContactId, setProjectContactId] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [error, setError] = useState('')
  const loadProjects = useCallback(async () => {
    if (!editableCustomer.id) return
    setIsLoadingProjects(true)
    setError('')
    try {
      const response = await customersApi.fetchProjects(Number(editableCustomer.id))
      const list = Array.isArray(response?.projects) ? response.projects : []
      setProjects(list)
      const defaultProject = list.find((item) => Boolean(item.isDefault)) || list[0] || null
      if (defaultProject) {
        setSelectedProjectId(toId(defaultProject.id))
        setProjectDraft(createProjectDraft(defaultProject, editableCustomer.id))
      } else {
        setSelectedProjectId('')
        setProjectDraft(createProjectDraft(null, editableCustomer.id))
        setProjectPhoneDraft('')
        setProjectContactId('')
      }
    } catch (err) {
      setError(err?.message || 'دریافت پروژه‌ها ناموفق بود.')
    } finally {
      setIsLoadingProjects(false)
    }
  }, [editableCustomer.id])
  const loadCustomerOptions = useCallback(async () => {
    try {
      const response = await customersApi.fetchCustomerDirectory({ page: 1, pageSize: 300, isActive: true })
      const list = Array.isArray(response?.customers) ? response.customers.filter((item) => item?.isActive !== false) : []
      setCustomerOptions(list)
    } catch {
      setCustomerOptions([])
    }
  }, [])
  const loadContacts = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectPhoneDraft('')
      setProjectContactId('')
      return
    }
    setError('')
    try {
      const response = await customersApi.fetchProjectContacts(Number(projectId))
      const list = Array.isArray(response?.contacts) ? response.contacts : []
      const mainContact = list.find((item) => Boolean(item.isPrimary)) || list[0] || null
      setProjectPhoneDraft(mainContact?.phone ? String(mainContact.phone) : '')
      setProjectContactId(mainContact?.id ? String(mainContact.id) : '')
    } catch (err) {
      setError(err?.message || 'دریافت شماره پروژه ناموفق بود.')
    }
  }, [])
  useEffect(() => {
    if (!isOpen) return
    setActiveTab('profile')
    setError('')
    setEditableCustomer(normalizedCustomer)
    setEditDraft(createCustomerDraft(normalizedCustomer))
    setIsSavingEdit(false)
    setProjects([])
    setSelectedProjectId('')
    setProjectDraft(createProjectDraft(null, normalizedCustomer.id))
    setProjectPhoneDraft('')
    setProjectContactId('')
    void loadCustomerOptions()
    void loadProjects()
  }, [isOpen, loadCustomerOptions, loadProjects, normalizedCustomer])
  useEffect(() => {
    if (!isOpen || !selectedProjectId) return
    const project = projects.find((item) => toId(item.id) === selectedProjectId) || null
    if (project) setProjectDraft(createProjectDraft(project, editableCustomer.id))
    void loadContacts(selectedProjectId)
  }, [editableCustomer.id, isOpen, loadContacts, projects, selectedProjectId])
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
      let targetProjectId = projectDraft.id ? Number(projectDraft.id) : 0
      if (projectDraft.id) {
        await customersApi.updateProject(payload)
      } else {
        const response = await customersApi.createProject(payload)
        targetProjectId = Number(response?.project?.id || 0)
      }

      const phone = String(projectPhoneDraft || '').trim()
      if (phone && targetProjectId > 0) {
        const contactPayload = {
          id: projectContactId ? Number(projectContactId) : undefined,
          projectId: targetProjectId,
          label: 'main',
          phone,
          sortOrder: 100,
          isPrimary: true,
        }
        if (projectContactId) await customersApi.updateProjectContact(contactPayload)
        else await customersApi.createProjectContact(contactPayload)
      }
      await loadProjects()
      await onReloadCustomerList?.()
    } catch (err) {
      setError(err?.message || 'ذخیره پروژه ناموفق بود.')
    }
  }
  const handleDeleteProject = async (project) => {
    if (!canWriteCustomers) return
    try {
      await customersApi.setProjectActive(Number(project.id), false)
      await loadProjects()
      await onReloadCustomerList?.()
      if (toId(projectDraft.id) === toId(project.id)) {
        setProjectDraft(createProjectDraft(null, editableCustomer.id))
        setSelectedProjectId('')
      }
    } catch (err) {
      setError(err?.message || 'حذف پروژه ناموفق بود.')
    }
  }
  const handleSaveCustomerEdit = async () => {
    if (!canWriteCustomers) return
    const fullName = String(editDraft.fullName || '').trim()
    if (!fullName) {
      setError('نام مشتری الزامی است.')
      return
    }
    setIsSavingEdit(true)
    setError('')
    try {
      const payload = {
        id: Number(editableCustomer.id),
        customerType: String(editDraft.customerType || 'individual'),
        fullName,
        companyName: String(editDraft.companyName || '').trim(),
        nationalId: String(editDraft.nationalId || '').trim(),
        economicCode: String(editDraft.economicCode || '').trim(),
        defaultPhone: String(editDraft.defaultPhone || '').trim(),
        email: String(editDraft.email || '').trim(),
        province: String(editDraft.province || '').trim(),
        city: String(editDraft.city || '').trim(),
        address: String(editDraft.address || '').trim(),
        notes: String(editDraft.notes || '').trim(),
        creditLimit: toNullableNumber(editDraft.creditLimit),
        paymentTermDays: toNullableNumber(editDraft.paymentTermDays),
        applyToOrderHistory: false,
      }
      const response = await customersApi.updateCustomer(payload)
      const nextCustomer = normalizeCustomerRecord(response?.customer || payload)
      setEditableCustomer(nextCustomer)
      setEditDraft(createCustomerDraft(nextCustomer))
      setActiveTab('profile')
      await onReloadCustomerList?.()
    } catch (err) {
      setError(err?.message || 'ویرایش مشتری ناموفق بود.')
    } finally {
      setIsSavingEdit(false)
    }
  }
  const profileCustomer = useMemo(() => ({ ...editableCustomer, updatedAt: formatDateTime(editableCustomer.updatedAt) }), [editableCustomer])
  return (
    <ModalShell
      isOpen={isOpen}
      title={`جزئیات مشتری: ${normalizedCustomer.fullName || '-'}`}
      description=""
      onClose={onClose}
      maxWidthClass="max-w-6xl"
      closeButtonMode="icon"
      headerClassName="border-slate-800 bg-none bg-slate-900 text-white [&_button]:text-white [&_button:hover]:bg-white/10"
      contentClassName="rounded-3xl border border-slate-300/70"
      bodyClassName="max-h-[82vh] space-y-3 bg-slate-100 p-4"
      footerClassName="bg-slate-100 px-4 py-3"
      footer={(
        <div className="flex items-center justify-between gap-3">
          <div className={`min-h-5 text-xs font-black ${error ? 'text-rose-700' : 'text-slate-600'}`}>
            {error || ' '}
          </div>
          <Button variant="secondary" onClick={onClose}>بستن</Button>
        </div>
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {DETAILS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'profile' ? (
        <CustomerDetailsProfileTab
          customer={profileCustomer}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          canWriteCustomers={canWriteCustomers}
          onSaveProfile={handleSaveCustomerEdit}
          isSavingProfile={isSavingEdit}
        />
      ) : null}
      {activeTab === 'projects' ? (
        <div className="space-y-4">
          <CustomerDetailsProjectsTab
            customerOptions={customerOptions}
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            selectedProjectId={selectedProjectId}
            projectDraft={projectDraft}
            setProjectDraft={setProjectDraft}
            projectPhoneDraft={projectPhoneDraft}
            setProjectPhoneDraft={setProjectPhoneDraft}
            canWriteCustomers={canWriteCustomers}
            resetProjectDraft={(project = null) => {
              setProjectDraft(createProjectDraft(project, normalizedCustomer.id))
              setSelectedProjectId(project ? toId(project.id) : '')
              if (!project) {
                setProjectPhoneDraft('')
                setProjectContactId('')
              }
            }}
            handleSaveProject={handleSaveProject}
            handleDeleteProject={handleDeleteProject}
          />
        </div>
      ) : null}
      {activeTab === 'financial' ? (
        <CustomerDetailsFinancialTab customer={normalizedCustomer} projects={projects} />
      ) : null}
      {activeTab === 'edit' ? (
        <CustomerDetailsEditTab
          draft={editDraft}
          setDraft={setEditDraft}
          canWriteCustomers={canWriteCustomers}
          isSaving={isSavingEdit}
          onSave={handleSaveCustomerEdit}
        />
      ) : null}
    </ModalShell>
  )
}
