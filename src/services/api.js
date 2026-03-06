const parsedTimeoutMs = Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? '10000', 10)
const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 10000
const APP_BASE_URL = import.meta.env.BASE_URL || '/'
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || '').trim()
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : ''

let _csrfToken = ''

export function setCsrfToken(token) {
  _csrfToken = token || ''
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function resolveRequestPath(path) {
  if (typeof path !== 'string') {
    return path
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  if (!path.startsWith('/api/')) {
    return path
  }

  if (API_BASE) {
    return `${API_BASE}${path.slice('/api'.length)}`
  }

  if (import.meta.env.DEV) {
    // Keep /api/* in dev so Vite proxy forwards requests correctly.
    return path
  }

  const normalizedBase = APP_BASE_URL === '/' ? '' : APP_BASE_URL.replace(/\/$/, '')
  return `${normalizedBase}${path}`
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  const method = (options.method || 'GET').toUpperCase()
  if (STATE_CHANGING_METHODS.has(method) && _csrfToken) {
    headers['X-CSRF-Token'] = _csrfToken
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
    response = await fetch(resolveRequestPath(path), {
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
  async login(username, password) {
    const data = await request('/api/login.php', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    const role = String(data?.role || '').trim()
    if (!data || typeof data !== 'object' || role === '') {
      throw new Error('Invalid login response. Please try again.')
    }
    return data
  },

  async logout() {
    return request('/api/logout.php', { method: 'POST' })
  },

  async bootstrap() {
    const cacheBuster = Date.now().toString(36)
    return request(`/api/bootstrap.php?_ts=${cacheBuster}`, { method: 'GET' })
  },

  async fetchAuditLogs(filters = {}) {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))
    if (filters?.from) params.set('from', String(filters.from))
    if (filters?.to) params.set('to', String(filters.to))
    if (filters?.eventType) params.set('eventType', String(filters.eventType))
    if (filters?.actor) params.set('actor', String(filters.actor))
    const query = params.toString()
    const path = query ? `/api/audit_logs.php?${query}` : '/api/audit_logs.php'
    return request(path, { method: 'GET' })
  },

  async fetchModuleRegistry() {
    return request('/api/module_registry.php', { method: 'GET' })
  },

  async setModuleEnabled(moduleId, enabled) {
    return request('/api/module_registry.php', {
      method: 'PATCH',
      body: JSON.stringify({ moduleId, enabled }),
    })
  },

  async fetchProfile() {
    return request('/api/profile.php', { method: 'GET' })
  },

  async saveProfile(profile) {
    return request('/api/profile.php', {
      method: 'POST',
      body: JSON.stringify(profile),
    })
  },

  async fetchOrders() {
    return request('/api/orders.php', { method: 'GET' })
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

  async saveCatalog(catalog) {
    return request('/api/catalog.php', {
      method: 'POST',
      body: JSON.stringify(catalog),
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
