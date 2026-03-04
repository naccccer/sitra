import { api } from '../../services/api'

export const auditLogsApi = {
  async fetchAuditLogs(filters = {}) {
    return api.fetchAuditLogs(filters)
  },

  async fetchUsers() {
    return api.fetchUsers()
  },
}
