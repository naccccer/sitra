import { api } from '../../../services/api'

export const customersApi = {
  async fetchCustomers(filters = {}) {
    return api.fetchCustomers({
      scope: 'directory',
      ...filters,
    })
  },

  async fetchCustomerDirectory(filters = {}) {
    return api.fetchCustomers({
      scope: 'directory',
      ...filters,
    })
  },

  async createCustomer(payload) {
    return api.createCustomer(payload)
  },

  async updateCustomer(payload) {
    return api.updateCustomer(payload)
  },

  async setCustomerActive(id, isActive) {
    return api.setCustomerActive(id, isActive)
  },

  async fetchProjects(customerId) {
    return api.fetchCustomerProjects(customerId)
  },

  async createProject(payload) {
    return api.createCustomerProject(payload)
  },

  async updateProject(payload) {
    return api.updateCustomerProject(payload)
  },

  async setProjectActive(id, isActive) {
    return api.setCustomerProjectActive(id, isActive)
  },

  async fetchProjectContacts(projectId) {
    return api.fetchCustomerProjectContacts(projectId)
  },

  async createProjectContact(payload) {
    return api.createCustomerProjectContact(payload)
  },

  async updateProjectContact(payload) {
    return api.updateCustomerProjectContact(payload)
  },

  async setProjectContactActive(id, isActive) {
    return api.setCustomerProjectContactActive(id, isActive)
  },
}
