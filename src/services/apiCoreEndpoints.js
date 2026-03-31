export function buildApiCoreEndpoints(request) {
  const resolveRole = (payload) => {
    const candidates = [
      payload?.role,
      payload?.user?.role,
      payload?.session?.role,
      payload?.currentUser?.role,
    ]
    for (const candidate of candidates) {
      const role = String(candidate || '').trim()
      if (role !== '') return role
    }
    return ''
  }

  const resolveUsername = (payload) => {
    const candidates = [
      payload?.username,
      payload?.user?.username,
      payload?.session?.username,
      payload?.currentUser?.username,
    ]
    for (const candidate of candidates) {
      const username = String(candidate || '').trim()
      if (username !== '') return username
    }
    return ''
  }

  return {
    async login(username, password) {
      const data = await request('/api/login.php', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid login response. Please try again.')
      }

      if (data?.success === false) {
        throw new Error(String(data?.error || 'Login failed. Please try again.'))
      }

      let role = resolveRole(data)
      let normalizedUsername = resolveUsername(data)

      if (role === '') {
        try {
          const cacheBuster = Date.now().toString(36)
          const bootstrap = await request(`/api/bootstrap.php?_ts=${cacheBuster}`, { method: 'GET' })
          role = resolveRole(bootstrap)
          if (normalizedUsername === '') {
            normalizedUsername = resolveUsername(bootstrap)
          }
        } catch {
          // Keep the original login response validation as final guard.
        }
      }

      if (role === '') {
        throw new Error('Invalid login response. Please try again.')
      }

      return {
        ...data,
        role,
        username: normalizedUsername || String(username || '').trim(),
      }
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

    async saveCatalog(catalog) {
      return request('/api/catalog.php', {
        method: 'POST',
        body: JSON.stringify(catalog),
      })
    },
  }
}
