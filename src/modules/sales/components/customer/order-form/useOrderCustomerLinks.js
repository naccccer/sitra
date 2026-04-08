import { useCallback, useEffect, useMemo, useState } from 'react'
import { customerLinksApi } from '@/modules/sales/services/customerLinksApi'
import { toEnglishDigits } from '@/modules/sales/components/customer/order-form/orderCustomerLinkDrafts'

const toId = (value) => String(value || '')
const toMessage = (error, fallback) => error?.message || fallback

export const useOrderCustomerLinks = ({
  isStaffContext,
  editingOrder,
  initialSelection = null,
  customerInfo,
  setCustomerInfo,
}) => {
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [projectContacts, setProjectContacts] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => toId(initialSelection?.customerId || editingOrder?.customerId))
  const [selectedProjectId, setSelectedProjectId] = useState(() => toId(initialSelection?.projectId || editingOrder?.projectId))
  const [selectedProjectContactId, setSelectedProjectContactId] = useState(() => toId(initialSelection?.projectContactId || editingOrder?.projectContactId))
  const [error, setError] = useState('')
  const [loadingState, setLoadingState] = useState({
    customers: false,
    projects: false,
    contacts: false,
    mutation: false,
  })

  const setLoading = useCallback((key, value) => {
    setLoadingState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const syncCustomerSnapshot = useCallback((customer, phoneFallback = '') => {
    if (!customer) return
    setCustomerInfo((prev) => ({
      ...prev,
      name: String(customer.fullName || prev?.name || ''),
      phone: String(customer.defaultPhone || phoneFallback || prev?.phone || ''),
    }))
  }, [setCustomerInfo])

  const syncContactSnapshot = useCallback((contact) => {
    if (!contact) return
    setCustomerInfo((prev) => ({
      ...prev,
      phone: String(contact.phone || prev?.phone || ''),
    }))
  }, [setCustomerInfo])

  const refreshCustomers = useCallback(async () => {
    if (!isStaffContext) return []
    setLoading('customers', true)
    try {
      const response = await customerLinksApi.fetchCustomers({ page: 1, pageSize: 300, isActive: true })
      const list = Array.isArray(response?.customers) ? response.customers : []
      setCustomers(list)
      return list
    } catch {
      setCustomers([])
      return []
    } finally {
      setLoading('customers', false)
    }
  }, [isStaffContext, setLoading])

  const refreshProjects = useCallback(async (customerId) => {
    if (!isStaffContext || !customerId) {
      setProjects([])
      return []
    }
    setLoading('projects', true)
    try {
      const response = await customerLinksApi.fetchProjects(customerId)
      const list = Array.isArray(response?.projects) ? response.projects : []
      setProjects(list)
      return list
    } catch {
      setProjects([])
      return []
    } finally {
      setLoading('projects', false)
    }
  }, [isStaffContext, setLoading])

  const refreshProjectContacts = useCallback(async (projectId) => {
    if (!isStaffContext || !projectId) {
      setProjectContacts([])
      return []
    }
    setLoading('contacts', true)
    try {
      const response = await customerLinksApi.fetchProjectContacts(projectId)
      const list = Array.isArray(response?.contacts) ? response.contacts : []
      setProjectContacts(list)
      return list
    } catch {
      setProjectContacts([])
      return []
    } finally {
      setLoading('contacts', false)
    }
  }, [isStaffContext, setLoading])

  useEffect(() => {
    void refreshCustomers()
  }, [refreshCustomers])

  useEffect(() => {
    if (!isStaffContext) return
    void refreshProjects(selectedCustomerId)
  }, [isStaffContext, refreshProjects, selectedCustomerId])

  useEffect(() => {
    if (!isStaffContext) return
    void refreshProjectContacts(selectedProjectId)
  }, [isStaffContext, refreshProjectContacts, selectedProjectId])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => toId(customer.id) === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  )
  const selectedProject = useMemo(
    () => projects.find((project) => toId(project.id) === selectedProjectId) || null,
    [projects, selectedProjectId],
  )
  const selectedContact = useMemo(
    () => projectContacts.find((contact) => toId(contact.id) === selectedProjectContactId) || null,
    [projectContacts, selectedProjectContactId],
  )

  const handleSelectCustomer = useCallback((customerId, fallbackCustomer = null) => {
    const id = toId(customerId)
    setSelectedCustomerId(id)
    setSelectedProjectId('')
    setSelectedProjectContactId('')
    const customer = fallbackCustomer || customers.find((item) => toId(item.id) === id)
    syncCustomerSnapshot(customer, customerInfo?.phone)
  }, [customerInfo?.phone, customers, syncCustomerSnapshot])

  const handleSelectProject = useCallback((projectId) => {
    setSelectedProjectId(toId(projectId))
    setSelectedProjectContactId('')
  }, [])

  const handleSelectProjectContact = useCallback((contactId, fallbackContact = null) => {
    const id = toId(contactId)
    setSelectedProjectContactId(id)
    const contact = fallbackContact || projectContacts.find((item) => toId(item.id) === id)
    syncContactSnapshot(contact)
  }, [projectContacts, syncContactSnapshot])

  const runMutation = useCallback(async (task, fallbackMessage) => {
    setError('')
    setLoading('mutation', true)
    try {
      return await task()
    } catch (nextError) {
      const message = toMessage(nextError, fallbackMessage)
      setError(message)
      throw nextError
    } finally {
      setLoading('mutation', false)
    }
  }, [setLoading])

  const createCustomer = useCallback((payload) => runMutation(async () => {
    const response = await customerLinksApi.createCustomer({
      fullName: String(payload?.fullName || '').trim(),
      defaultPhone: toEnglishDigits(payload?.defaultPhone),
    })
    const createdCustomer = response?.customer || null
    await refreshCustomers()
    if (createdCustomer?.id) handleSelectCustomer(createdCustomer.id, createdCustomer)
    return createdCustomer
  }, 'ثبت مشتری ناموفق بود.'), [handleSelectCustomer, refreshCustomers, runMutation])

  const updateCustomer = useCallback((payload) => runMutation(async () => {
    const response = await customerLinksApi.updateCustomer({
      id: Number(payload?.id || 0),
      fullName: String(payload?.fullName || '').trim(),
      defaultPhone: toEnglishDigits(payload?.defaultPhone),
      applyToOrderHistory: Boolean(payload?.applyToOrderHistory),
    })
    const updatedCustomer = response?.customer || null
    await refreshCustomers()
    if (updatedCustomer?.id) handleSelectCustomer(updatedCustomer.id, updatedCustomer)
    return updatedCustomer
  }, 'ویرایش مشتری ناموفق بود.'), [handleSelectCustomer, refreshCustomers, runMutation])

  const createProject = useCallback((payload) => runMutation(async () => {
    const response = await customerLinksApi.createProject({
      customerId: Number(payload?.customerId || selectedCustomerId || 0),
      name: String(payload?.name || '').trim(),
      notes: String(payload?.notes || '').trim(),
      isDefault: Boolean(payload?.isDefault),
    })
    const createdProject = response?.project || null
    await refreshProjects(payload?.customerId || selectedCustomerId)
    if (createdProject?.id) handleSelectProject(createdProject.id)
    return createdProject
  }, 'ثبت پروژه ناموفق بود.'), [handleSelectProject, refreshProjects, runMutation, selectedCustomerId])

  const createProjectContact = useCallback((payload) => runMutation(async () => {
    const response = await customerLinksApi.createProjectContact({
      projectId: Number(payload?.projectId || selectedProjectId || 0),
      label: String(payload?.label || 'main').trim() || 'main',
      phone: toEnglishDigits(payload?.phone),
      isPrimary: Boolean(payload?.isPrimary ?? true),
      sortOrder: 100,
    })
    const createdContact = response?.contact || null
    await refreshProjectContacts(payload?.projectId || selectedProjectId)
    if (createdContact?.id) handleSelectProjectContact(createdContact.id, createdContact)
    return createdContact
  }, 'ثبت شماره پروژه ناموفق بود.'), [handleSelectProjectContact, refreshProjectContacts, runMutation, selectedProjectId])

  return {
    customers,
    projects,
    projectContacts,
    selectedCustomer,
    selectedProject,
    selectedContact,
    selectedCustomerId,
    selectedProjectId,
    selectedProjectContactId,
    loadingCustomers: loadingState.customers,
    loadingProjects: loadingState.projects,
    loadingProjectContacts: loadingState.contacts,
    isMutating: loadingState.mutation,
    error,
    setError,
    setSelectedCustomerId: handleSelectCustomer,
    setSelectedProjectId: handleSelectProject,
    setSelectedProjectContactId: handleSelectProjectContact,
    refreshCustomers,
    refreshProjects,
    refreshProjectContacts,
    createCustomer,
    updateCustomer,
    createProject,
    createProjectContact,
  }
}
