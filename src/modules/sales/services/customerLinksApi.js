import { api } from '../../../services/api'

export const customerLinksApi = {
  async fetchCustomers(filters = {}) {
    return api.fetchCustomers(filters)
  },

  async createCustomer(payload) {
    return api.createCustomer(payload)
  },

  async updateCustomer(payload) {
    return api.updateCustomer(payload)
  },

  async fetchProjects(customerId) {
    return api.fetchCustomerProjects(customerId)
  },

  async createProject(payload) {
    return api.createCustomerProject(payload)
  },

  async fetchProjectContacts(projectId) {
    return api.fetchCustomerProjectContacts(projectId)
  },

  async createProjectContact(payload) {
    return api.createCustomerProjectContact(payload)
  },
}
