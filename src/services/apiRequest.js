const parsedTimeoutMs = Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? '10000', 10)
const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 10000
const APP_BASE_URL = import.meta.env.BASE_URL || '/'
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || '').trim()
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : ''
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

// Wrapped in an object so the token is mockable in tests.
const _csrf = { token: '' }

export function setCsrfToken(token) {
  _csrf.token = token || ''
}

export function clearCsrfToken() {
  _csrf.token = ''
}

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

export async function request(path, options = {}) {
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
        cache: 'no-store',
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
