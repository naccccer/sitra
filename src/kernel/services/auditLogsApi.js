import { api } from '../../services/api'

/** @typedef {import('../contracts').KernelAuditLogFilters} KernelAuditLogFilters */

export const auditLogsApi = {
  /**
   * @param {KernelAuditLogFilters} [filters]
   * @returns {Promise<{ items: Array<object>, total: number, page: number, pageSize: number }>}
   */
  async fetchAuditLogs(filters = {}) {
    return api.fetchAuditLogs(filters)
  },

  /**
   * @returns {Promise<{ users: Array<object> }>}
   */
  async fetchUsers() {
    return api.fetchUsers()
  },
}
