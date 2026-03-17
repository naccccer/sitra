export function buildApiBusinessEndpoints(request) {
  return {
    async fetchOrders({ cursor } = {}) {
      const url = cursor ? `/api/orders.php?cursor=${encodeURIComponent(cursor)}` : '/api/orders.php'
      return request(url, { method: 'GET' })
    },
    async createOrder(payload, options = {}) {
      const clientRequestId = typeof options.clientRequestId === 'string' ? options.clientRequestId : null
      return request('/api/orders.php', {
        method: 'POST',
        body: JSON.stringify({
          ...(payload || {}),
          ...(clientRequestId ? { clientRequestId } : {}),
        }),
      })
    },
    async updateOrder(payload, options = {}) {
      const clientRequestId = typeof options.clientRequestId === 'string' ? options.clientRequestId : null
      const expectedUpdatedAt = typeof options.expectedUpdatedAt === 'string' ? options.expectedUpdatedAt : null
      return request('/api/orders.php', {
        method: 'PUT',
        body: JSON.stringify({
          ...(payload || {}),
          ...(clientRequestId ? { clientRequestId } : {}),
          ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        }),
      })
    },
    async updateOrderStatus(id, status, options = {}) {
      const clientRequestId = typeof options.clientRequestId === 'string' ? options.clientRequestId : null
      const expectedUpdatedAt = typeof options.expectedUpdatedAt === 'string' ? options.expectedUpdatedAt : null
      return request('/api/orders.php', {
        method: 'PATCH',
        body: JSON.stringify({
          id,
          status,
          ...(clientRequestId ? { clientRequestId } : {}),
          ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        }),
      })
    },
    async deleteOrder(id) {
      return request('/api/orders.php', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      })
    },
    async fetchUsers() {
      return request('/api/users.php', { method: 'GET' })
    },
    async createUser(payload) {
      return request('/api/users.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async updateUser(payload) {
      return request('/api/users.php', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
    async setUserActive(id, isActive) {
      return request('/api/users.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive }),
      })
    },
    async fetchRolePermissions() {
      return request('/api/role_permissions.php', { method: 'GET' })
    },
    async saveRolePermissions(rolePermissions) {
      return request('/api/role_permissions.php', {
        method: 'POST',
        body: JSON.stringify({ rolePermissions }),
      })
    },
    async fetchCustomers(filters = {}) {
      const params = new URLSearchParams()
      if (filters?.q) params.set('q', String(filters.q))
      if (typeof filters?.isActive === 'boolean') params.set('isActive', String(filters.isActive))
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))
      const query = params.toString()
      const path = query ? `/api/customers.php?${query}` : '/api/customers.php'
      return request(path, { method: 'GET' })
    },
    async createCustomer(payload) {
      return request('/api/customers.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async updateCustomer(payload) {
      return request('/api/customers.php', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
    async setCustomerActive(id, isActive) {
      return request('/api/customers.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive }),
      })
    },
    async fetchCustomerProjects(customerId) {
      const params = new URLSearchParams()
      if (customerId !== undefined && customerId !== null) params.set('customerId', String(customerId))
      const query = params.toString()
      const path = query ? `/api/customer_projects.php?${query}` : '/api/customer_projects.php'
      return request(path, { method: 'GET' })
    },
    async createCustomerProject(payload) {
      return request('/api/customer_projects.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async updateCustomerProject(payload) {
      return request('/api/customer_projects.php', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
    async setCustomerProjectActive(id, isActive) {
      return request('/api/customer_projects.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive }),
      })
    },
    async fetchCustomerProjectContacts(projectId) {
      const params = new URLSearchParams()
      params.set('projectId', String(projectId))
      return request(`/api/customer_project_contacts.php?${params.toString()}`, { method: 'GET' })
    },
    async createCustomerProjectContact(payload) {
      return request('/api/customer_project_contacts.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async updateCustomerProjectContact(payload) {
      return request('/api/customer_project_contacts.php', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
    async setCustomerProjectContactActive(id, isActive) {
      return request('/api/customer_project_contacts.php', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive }),
      })
    },
    async uploadLogo(file) {
      const formData = new FormData()
      formData.append('logoFile', file)
      return request('/api/upload_logo.php', {
        method: 'POST',
        body: formData,
      })
    },
    async uploadPatternFile(file) {
      const formData = new FormData()
      formData.append('patternFile', file)
      return request('/api/upload.php', {
        method: 'POST',
        body: formData,
      })
    },
    async uploadReceiptFile(file) {
      const formData = new FormData()
      formData.append('patternFile', file)
      return request('/api/upload.php', {
        method: 'POST',
        body: formData,
      })
    },
  }
}
