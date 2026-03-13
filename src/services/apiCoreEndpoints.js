export function buildApiCoreEndpoints(request) {
  return {
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

    async saveCatalog(catalog) {
      return request('/api/catalog.php', {
        method: 'POST',
        body: JSON.stringify(catalog),
      })
    },
  }
}
