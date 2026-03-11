import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, clearCsrfToken, setCsrfToken } from '../../src/services/api'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function mockFetchOk(data, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

function mockFetchError(status, data = { error: 'Server error' }) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

function captureHeaders() {
  let captured = null
  const fetch = vi.fn().mockImplementation((_url, opts) => {
    captured = opts?.headers || {}
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
    })
  })
  return { fetch, getHeaders: () => captured }
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('setCsrfToken / CSRF injection', () => {
  beforeEach(() => {
    setCsrfToken('')
  })

  it('injects X-CSRF-Token header on POST', async () => {
    setCsrfToken('tok-123')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.createOrder({ customerName: 'Test' })

    expect(getHeaders()['X-CSRF-Token']).toBe('tok-123')
  })

  it('injects X-CSRF-Token header on PUT', async () => {
    setCsrfToken('tok-put')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.updateOrder({ id: '1', customerName: 'Test' })

    expect(getHeaders()['X-CSRF-Token']).toBe('tok-put')
  })

  it('injects X-CSRF-Token header on PATCH', async () => {
    setCsrfToken('tok-patch')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.updateOrderStatus('1', 'processing')

    expect(getHeaders()['X-CSRF-Token']).toBe('tok-patch')
  })

  it('injects X-CSRF-Token header on DELETE', async () => {
    setCsrfToken('tok-del')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.deleteOrder('1')

    expect(getHeaders()['X-CSRF-Token']).toBe('tok-del')
  })

  it('does NOT inject X-CSRF-Token on GET', async () => {
    setCsrfToken('tok-get')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.fetchOrders()

    expect(getHeaders()['X-CSRF-Token']).toBeUndefined()
  })

  it('does NOT inject X-CSRF-Token when token is empty', async () => {
    setCsrfToken('')
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.createOrder({})

    expect(getHeaders()['X-CSRF-Token']).toBeUndefined()
  })

  it('refreshes csrf token and retries once when server returns csrf failure', async () => {
    setCsrfToken('stale-token')

    const calls = []
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url, opts = {}) => {
      calls.push({ url: String(url), headers: { ...(opts.headers || {}) } })

      if (String(url).includes('/api/orders.php') && calls.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: () => Promise.resolve(JSON.stringify({ error: 'csrf token mismatch' })),
        })
      }

      if (String(url).includes('/api/bootstrap.php')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ csrfToken: 'fresh-token' })),
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
      })
    }))

    await api.createOrder({ customerName: 'Retry test' })

    const orderRequests = calls.filter((c) => c.url.includes('/api/orders.php'))
    expect(orderRequests).toHaveLength(2)
    expect(orderRequests[0].headers['X-CSRF-Token']).toBe('stale-token')
    expect(orderRequests[1].headers['X-CSRF-Token']).toBe('fresh-token')
  })
})

describe('error handling', () => {
  beforeEach(() => {
    setCsrfToken('tok')
  })

  it('throws on 401 with error message from server', async () => {
    vi.stubGlobal('fetch', mockFetchError(401, { error: 'Authentication required.' }))

    await expect(api.fetchOrders()).rejects.toMatchObject({
      message: 'Authentication required.',
      status: 401,
    })
  })

  it('throws on 403 with generic message when no body', async () => {
    vi.stubGlobal('fetch', mockFetchError(403, {}))

    await expect(api.fetchOrders()).rejects.toMatchObject({
      status: 403,
    })
  })

  it('throws on 500 with status attached to error', async () => {
    vi.stubGlobal('fetch', mockFetchError(500, { error: 'Internal server error.' }))

    const err = await api.fetchOrders().catch((e) => e)
    expect(err.status).toBe(500)
    expect(err.message).toBe('Internal server error.')
  })

  it('attaches payload to thrown error', async () => {
    const serverPayload = { error: 'order_conflict', code: 'order_conflict', serverOrder: { id: '5' } }
    vi.stubGlobal('fetch', mockFetchError(409, serverPayload))

    const err = await api.updateOrder({ id: '5' }).catch((e) => e)
    expect(err.payload).toMatchObject(serverPayload)
  })
})

describe('request shape', () => {
  beforeEach(() => {
    setCsrfToken('tok')
  })

  it('sends JSON Content-Type for non-FormData bodies', async () => {
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.createOrder({ customerName: 'Test' })

    expect(getHeaders()['Content-Type']).toBe('application/json')
  })

  it('does NOT set Content-Type for FormData (lets browser set multipart boundary)', async () => {
    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    const formData = new FormData()
    formData.append('logoFile', new Blob(['x']), 'logo.png')
    await api.uploadLogo(new File(['x'], 'logo.png', { type: 'image/png' }))

    expect(getHeaders()['Content-Type']).toBeUndefined()
  })

  it('includes credentials: include on every request', async () => {
    let capturedOpts = null
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedOpts = opts
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') })
    }))

    await api.fetchProfile()

    expect(capturedOpts.credentials).toBe('include')
  })

  it('login throws when response has no role', async () => {
    vi.stubGlobal('fetch', mockFetchOk({ username: 'admin' }))  // missing role

    await expect(api.login('admin', 'pass')).rejects.toThrow('Invalid login response')
  })
})

// ------------------------------------------------------------------
// clearCsrfToken
// ------------------------------------------------------------------

describe('clearCsrfToken', () => {
  beforeEach(() => {
    setCsrfToken('')
  })

  it('removes X-CSRF-Token header after clearing', async () => {
    setCsrfToken('tok-active')
    clearCsrfToken()

    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.createOrder({ customerName: 'Test' })

    expect(getHeaders()['X-CSRF-Token']).toBeUndefined()
  })

  it('does not affect GET requests (which never carry CSRF)', async () => {
    setCsrfToken('tok-active')
    clearCsrfToken()

    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.fetchOrders()

    expect(getHeaders()['X-CSRF-Token']).toBeUndefined()
  })

  it('allows a new token to be set after clearing', async () => {
    setCsrfToken('old-tok')
    clearCsrfToken()
    setCsrfToken('new-tok')

    const { fetch, getHeaders } = captureHeaders()
    vi.stubGlobal('fetch', fetch)

    await api.createOrder({ customerName: 'Test' })

    expect(getHeaders()['X-CSRF-Token']).toBe('new-tok')
  })
})
