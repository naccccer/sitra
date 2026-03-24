import { request } from '@/services/apiRequest'

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

const employeeRequest = (method, payload = {}, query = {}) => request(`/api/hr_employees.php${buildQuery(query)}`, {
  method,
  body: JSON.stringify(payload),
})

export const humanResourcesApi = {
  async fetchEmployees(filters = {}) {
    return request(`/api/hr_employees.php${buildQuery(filters)}`, { method: 'GET' })
  },

  async fetchEmployee(id) {
    return request(`/api/hr_employees.php${buildQuery({ id })}`, { method: 'GET' })
  },

  async createEmployee(payload) {
    return employeeRequest('POST', payload)
  },

  async updateEmployee(payload) {
    return employeeRequest('PUT', payload)
  },

  async setEmployeeActive(id, isActive) {
    return employeeRequest('PATCH', { id, isActive })
  },

  async deleteEmployee(id) {
    return employeeRequest('DELETE', { id })
  },

  async fetchDocuments(employeeId) {
    return request(`/api/hr_documents.php${buildQuery({ employeeId })}`, { method: 'GET' })
  },

  async uploadDocument(employeeId, title, file) {
    const formData = new FormData()
    formData.append('employeeId', String(employeeId))
    formData.append('title', title)
    formData.append('document', file)
    return request('/api/hr_documents.php', { method: 'POST', body: formData })
  },

  async deleteDocument(documentId) {
    return request(`/api/hr_documents.php${buildQuery({ id: documentId })}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: documentId }),
    })
  },
}
