const parsedTimeoutMs = Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? '10000', 10)
const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 10000

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  let timeoutId = null

  if (controller && options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason)
    } else {
      options.signal.addEventListener(
        'abort',
        () => {
          controller.abort(options.signal.reason)
        },
        { once: true },
      )
    }
  }

  if (controller) {
    timeoutId = setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)
  }

  let response
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...options,
      signal: controller ? controller.signal : options.signal,
      headers,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }

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

  async deleteOrder(id) {
    return request('/api/orders.php', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
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
