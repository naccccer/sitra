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
