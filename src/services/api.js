const parsedTimeoutMs = Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? '10000', 10)
const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 10000
const APP_BASE_URL = import.meta.env.BASE_URL || '/'
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || '').trim()
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : ''

// Wrapped in an object so the token is mockable in tests.
const _csrf = { token: '' }

/**
 * Set the CSRF token to be sent on all state-changing requests.
 * Call this once after receiving the token from `GET /api/bootstrap.php`.
 * @param {string} token
 */
export function setCsrfToken(token) {
  _csrf.token = token || ''
}

/**
 * Clear the CSRF token. Call this on logout so stale tokens are not retained
 * in memory after the session is destroyed.
 */
export function clearCsrfToken() {
  _csrf.token = ''
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

/**
 * Resolve a `/api/*` path to the correct full URL based on env config.
 * Absolute URLs (http/https) are returned unchanged.
 * @param {string} path
 * @returns {string}
 */
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

function parseResponseData(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isCsrfFailurePayload(payload) {
  const errorText = String(payload?.error || payload?.message || '').toLowerCase()
  return errorText.includes('csrf')
}

async function refreshCsrfToken() {
  try {
    const cacheBuster = Date.now().toString(36)
    const response = await fetch(resolveRequestPath(`/api/bootstrap.php?_ts=${cacheBuster}`), {
      method: 'GET',
      credentials: 'include',
    })
    const data = parseResponseData(await response.text())
    const token = typeof data?.csrfToken === 'string' ? data.csrfToken : ''
    if (token) setCsrfToken(token)
    return token
  } catch {
    return ''
  }
}

/**
 * Core HTTP request helper.
 * Automatically injects Content-Type, CSRF token, credentials, and a timeout.
 * Throws an Error (with `.status` and `.payload`) on non-2xx responses.
 * @param {string} path - API path (e.g. `/api/orders.php`)
 * @param {RequestInit & { signal?: AbortSignal }} [options]
 * @returns {Promise<any>} Parsed JSON response body
 * @throws {Error & { status: number, payload: any }}
 */
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const method = (options.method || 'GET').toUpperCase()
  const isStateChanging = STATE_CHANGING_METHODS.has(method)
  if (isStateChanging && !_csrf.token) {
    await refreshCsrfToken()
  }
  if (isStateChanging && _csrf.token) {
    headers['X-CSRF-Token'] = _csrf.token
  }

  const sendRequest = async (requestHeaders) => {
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

    try {
      const response = await fetch(resolveRequestPath(path), {
        credentials: 'include',
        ...options,
        signal: controller ? controller.signal : options.signal,
        headers: requestHeaders,
      })
      const data = parseResponseData(await response.text())
      return { response, data }
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
  }

  let result = await sendRequest(headers)

  if (
    isStateChanging
    && result.response.status === 403
    && isCsrfFailurePayload(result.data)
  ) {
    const refreshedToken = await refreshCsrfToken()
    if (refreshedToken) {
      headers['X-CSRF-Token'] = refreshedToken
      result = await sendRequest(headers)
    }
  }

  if (!result.response.ok) {
    const message = result.data?.error || result.data?.message || `Request failed with status ${result.response.status}`
    const error = new Error(message)
    error.status = result.response.status
    error.payload = result.data
    throw error
  }

  return result.data
}

export const api = {
  /**
   * Authenticate a user and establish a session cookie.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ role: string, username: string }>}
   * @throws {Error} On invalid credentials or server error
   */
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

  /**
   * Destroy the current session.
   * @returns {Promise<void>}
   */
  async logout() {
    return request('/api/logout.php', { method: 'POST' })
  },

  /**
   * Fetch the full bootstrap payload: session, catalog, profile, orders, permissions, capabilities, CSRF token.
   * Call `setCsrfToken(data.csrfToken)` after this resolves.
   * @returns {Promise<import('./bootstrapCache').BootstrapPayload>}
   */
  async bootstrap() {
    const cacheBuster = Date.now().toString(36)
    return request(`/api/bootstrap.php?_ts=${cacheBuster}`, { method: 'GET' })
  },

  /**
   * Fetch paginated audit log entries.
   * @param {{ page?: number, pageSize?: number, from?: string, to?: string, eventType?: string, actor?: string }} [filters]
   * @returns {Promise<{ items: any[], total: number, page: number, pageSize: number }>}
   */
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

  /**
   * Fetch the full module registry (enabled/disabled state of each module).
   * Only accessible to owner/admin.
   * @returns {Promise<{ modules: any[] }>}
   */
  async fetchModuleRegistry() {
    return request('/api/module_registry.php', { method: 'GET' })
  },

  /**
   * Enable or disable a module by its ID.
   * @param {string} moduleId
   * @param {boolean} enabled
   * @returns {Promise<void>}
   */
  async setModuleEnabled(moduleId, enabled) {
    return request('/api/module_registry.php', {
      method: 'PATCH',
      body: JSON.stringify({ moduleId, enabled }),
    })
  },

  /**
   * Fetch the company profile (name, address, logo, invoice settings).
   * @returns {Promise<any>}
   */
  async fetchProfile() {
    return request('/api/profile.php', { method: 'GET' })
  },

  /**
   * Save the company profile.
   * @param {any} profile
   * @returns {Promise<any>}
   */
  async saveProfile(profile) {
    return request('/api/profile.php', {
      method: 'POST',
      body: JSON.stringify(profile),
    })
  },

  /**
   * Fetch a page of orders. Supports cursor-based pagination.
   * @param {{ cursor?: string|null }} [opts]
   * @returns {Promise<{ orders: any[], hasMore: boolean, nextCursor: string|null }>}
   */
  async fetchOrders({ cursor } = {}) {
    const url = cursor ? `/api/orders.php?cursor=${encodeURIComponent(cursor)}` : '/api/orders.php'
    return request(url, { method: 'GET' })
  },

  /**
   * Create a new order.
   * @param {any} payload - Order data (customer, items, financials, etc.)
   * @param {{ clientRequestId?: string }} [options] - Pass a `clientRequestId` for idempotency
   * @returns {Promise<{ order: any }>}
   */
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

  /**
   * Fully update an existing order.
   * @param {any} payload - Updated order data (must include `id`)
   * @param {{ clientRequestId?: string, expectedUpdatedAt?: string }} [options]
   * @returns {Promise<{ order: any }>}
   */
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

  /**
   * Update only the status of an order.
   * @param {string|number} id - Order ID
   * @param {'pending'|'processing'|'delivered'|'archived'} status
   * @param {{ clientRequestId?: string, expectedUpdatedAt?: string }} [options]
   * @returns {Promise<{ order: any }>}
   */
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

  /**
   * Delete an order by ID. Requires admin role.
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async deleteOrder(id) {
    return request('/api/orders.php', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    })
  },

  /**
   * Save the product catalog (replaces the full catalog JSON).
   * @param {any} catalog
   * @returns {Promise<any>}
   */
  async saveCatalog(catalog) {
    return request('/api/catalog.php', {
      method: 'POST',
      body: JSON.stringify(catalog),
    })
  },

  /**
   * Fetch all users. Requires admin role.
   * @returns {Promise<{ users: any[] }>}
   */
  async fetchUsers() {
    return request('/api/users.php', { method: 'GET' })
  },

  /**
   * Create a new user.
   * @param {{ username: string, password: string, role: 'admin'|'manager'|'sales' }} payload
   * @returns {Promise<{ user: any }>}
   */
  async createUser(payload) {
    return request('/api/users.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update an existing user (username, password, role).
   * @param {{ id: number, username?: string, password?: string, role?: string }} payload
   * @returns {Promise<{ user: any }>}
   */
  async updateUser(payload) {
    return request('/api/users.php', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Activate or deactivate a user account.
   * @param {number} id
   * @param {boolean} isActive
   * @returns {Promise<void>}
   */
  async setUserActive(id, isActive) {
    return request('/api/users.php', {
      method: 'PATCH',
      body: JSON.stringify({ id, isActive }),
    })
  },

  /**
   * Fetch the role-permissions matrix.
   * @returns {Promise<{ rolePermissions: Record<string, string[]> }>}
   */
  async fetchRolePermissions() {
    return request('/api/role_permissions.php', { method: 'GET' })
  },

  /**
   * Save the role-permissions matrix.
   * @param {Record<string, string[]>} rolePermissions - Map of role → permission array
   * @returns {Promise<void>}
   */
  async saveRolePermissions(rolePermissions) {
    return request('/api/role_permissions.php', {
      method: 'POST',
      body: JSON.stringify({ rolePermissions }),
    })
  },

  /**
   * Upload a company logo image.
   * @param {File} file - Image file (jpg, png, webp, gif, svg)
   * @returns {Promise<{ filePath: string, originalName: string, mimeType: string, size: number }>}
   */
  async uploadLogo(file) {
    const formData = new FormData()
    formData.append('logoFile', file)
    return request('/api/upload_logo.php', {
      method: 'POST',
      body: formData,
    })
  },

  /**
   * Upload a pattern/design file attached to an order item.
   * Accepted formats: pdf, dwg, dxf, jpg, jpeg, png. Max 10MB.
   * @param {File} file
   * @returns {Promise<{ filePath: string, originalName: string, mimeType: string, size: number }>}
   */
  async uploadPatternFile(file) {
    const formData = new FormData()
    formData.append('patternFile', file)
    return request('/api/upload.php', {
      method: 'POST',
      body: formData,
    })
  },

  /**
   * Upload a payment receipt file attached to an order.
   * Uses the same upload endpoint and field name as pattern files.
   * Accepted formats: pdf, dwg, dxf, jpg, jpeg, png. Max 10MB.
   * @param {File} file
   * @returns {Promise<{ filePath: string, originalName: string, mimeType: string, size: number }>}
   */
  async uploadReceiptFile(file) {
    const formData = new FormData()
    formData.append('patternFile', file)
    return request('/api/upload.php', {
      method: 'POST',
      body: formData,
    })
  },
}
