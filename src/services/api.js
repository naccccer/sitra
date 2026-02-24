async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers,
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    throw error
  }

  return data
}

export const api = {
  async bootstrap() {
    return request('/api/bootstrap.php', { method: 'GET' })
  },

  async fetchOrders() {
    return request('/api/orders.php', { method: 'GET' })
  },

  async createOrder(payload) {
    return request('/api/orders.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateOrder(payload) {
    return request('/api/orders.php', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async updateOrderStatus(id, status) {
    return request('/api/orders.php', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    })
  },

  async saveCatalog(catalog) {
    return request('/api/catalog.php', {
      method: 'POST',
      body: JSON.stringify(catalog),
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
