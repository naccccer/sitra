import { useCallback, useEffect, useMemo, useState } from 'react'
import { customerLinksApi } from '@/modules/sales/services/customerLinksApi'

const toId = (value) => String(value || '')

export const useOrderCustomerLinks = ({
  isStaffContext,
  editingOrder,
  customerInfo,
  setCustomerInfo,
}) => {
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [projectContacts, setProjectContacts] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => toId(editingOrder?.customerId))
  const [selectedProjectId, setSelectedProjectId] = useState(() => toId(editingOrder?.projectId))
  const [selectedProjectContactId, setSelectedProjectContactId] = useState(() => toId(editingOrder?.projectContactId))

  const refreshCustomers = useCallback(async () => {
    if (!isStaffContext) return
    const response = await customerLinksApi.fetchCustomers({ page: 1, pageSize: 200, isActive: true })
    const list = Array.isArray(response?.customers) ? response.customers : []
    setCustomers(list)
    if (!selectedCustomerId && list.length > 0) {
      setSelectedCustomerId(toId(list[0].id))
      setCustomerInfo((prev) => ({
        ...prev,
        name: String(prev?.name || '').trim() || String(list[0]?.fullName || ''),
        phone: String(prev?.phone || '').trim() || String(list[0]?.defaultPhone || ''),
      }))
    }
  }, [isStaffContext, selectedCustomerId, setCustomerInfo])

  const refreshProjects = useCallback(async (customerId) => {
    if (!isStaffContext || !customerId) {
      setProjects([])
      return
    }
    const response = await customerLinksApi.fetchProjects(customerId)
    const list = Array.isArray(response?.projects) ? response.projects : []
    setProjects(list)
    if (!selectedProjectId && list.length > 0) {
      setSelectedProjectId(toId(list[0].id))
    }
  }, [isStaffContext, selectedProjectId])

  const refreshProjectContacts = useCallback(async (projectId) => {
    if (!isStaffContext || !projectId) {
      setProjectContacts([])
      return
    }
    const response = await customerLinksApi.fetchProjectContacts(projectId)
    const list = Array.isArray(response?.contacts) ? response.contacts : []
    setProjectContacts(list)
    if (!selectedProjectContactId && list.length > 0) {
      setSelectedProjectContactId(toId(list[0].id))
    }
  }, [isStaffContext, selectedProjectContactId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCustomers()
  }, [refreshCustomers])

  useEffect(() => {
    if (!isStaffContext) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshProjects(selectedCustomerId)
  }, [isStaffContext, refreshProjects, selectedCustomerId])

  useEffect(() => {
    if (!isStaffContext) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleSelectCustomer = (customerId) => {
    const id = toId(customerId)
    setSelectedCustomerId(id)
    setSelectedProjectId('')
    setSelectedProjectContactId('')
    const customer = customers.find((item) => toId(item.id) === id)
    if (!customer) return
    setCustomerInfo((prev) => ({
      ...prev,
      name: String(customer.fullName || ''),
      phone: String(customer.defaultPhone || prev?.phone || ''),
    }))
  }

  const handleSelectProject = (projectId) => {
    const id = toId(projectId)
    setSelectedProjectId(id)
    setSelectedProjectContactId('')
  }

  const handleSelectProjectContact = (contactId) => {
    const id = toId(contactId)
    setSelectedProjectContactId(id)
    const contact = projectContacts.find((item) => toId(item.id) === id)
    if (!contact) return
    setCustomerInfo((prev) => ({
      ...prev,
      phone: String(contact.phone || ''),
    }))
  }

  const createQuickCustomer = async () => {
    const fullName = window.prompt('نام مشتری', String(customerInfo?.name || ''))
    if (fullName === null) return
    const defaultPhone = window.prompt('تلفن پیش‌فرض', String(customerInfo?.phone || ''))
    if (defaultPhone === null) return
    const response = await customerLinksApi.createCustomer({ fullName: fullName.trim(), defaultPhone: defaultPhone.trim() })
    await refreshCustomers()
    const createdId = toId(response?.customer?.id)
    if (createdId) handleSelectCustomer(createdId)
  }

  const editQuickCustomer = async () => {
    if (!selectedCustomer) return
    const fullName = window.prompt('نام مشتری', String(selectedCustomer.fullName || ''))
    if (fullName === null) return
    const defaultPhone = window.prompt('تلفن پیش‌فرض', String(selectedCustomer.defaultPhone || ''))
    if (defaultPhone === null) return
    const applyToOrderHistory = window.confirm('نام/تلفن روی سفارش‌های قبلی همین مشتری هم اعمال شود؟')
    await customerLinksApi.updateCustomer({
      id: Number(selectedCustomer.id),
      fullName: fullName.trim(),
      defaultPhone: defaultPhone.trim(),
      applyToOrderHistory,
    })
    await refreshCustomers()
    handleSelectCustomer(selectedCustomer.id)
  }

  const createQuickProject = async () => {
    if (!selectedCustomerId) return
    const name = window.prompt('نام پروژه', '')
    if (!name) return
    const response = await customerLinksApi.createProject({
      customerId: Number(selectedCustomerId),
      name: name.trim(),
    })
    await refreshProjects(selectedCustomerId)
    const createdId = toId(response?.project?.id)
    if (createdId) setSelectedProjectId(createdId)
  }

  const createQuickProjectContact = async () => {
    if (!selectedProjectId) return
    const phone = window.prompt('شماره تماس پروژه', String(customerInfo?.phone || ''))
    if (!phone) return
    const response = await customerLinksApi.createProjectContact({
      projectId: Number(selectedProjectId),
      label: 'main',
      phone: phone.trim(),
      isPrimary: true,
    })
    await refreshProjectContacts(selectedProjectId)
    const createdId = toId(response?.contact?.id)
    if (createdId) handleSelectProjectContact(createdId)
  }

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
    setSelectedCustomerId: handleSelectCustomer,
    setSelectedProjectId: handleSelectProject,
    setSelectedProjectContactId: handleSelectProjectContact,
    createQuickCustomer,
    editQuickCustomer,
    createQuickProject,
    createQuickProjectContact,
  }
}
