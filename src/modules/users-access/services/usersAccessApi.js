import { api } from '../../../services/api'

/**
 * @typedef {Object} UsersAccessUserPayload
 * @property {number|string} [id]
 * @property {string} [username]
 * @property {string} [fullName]
 * @property {string|null} [jobTitle]
 * @property {string} [password]
 * @property {'admin'|'manager'|'sales'} [role]
 */

/** @typedef {Record<string, Array<string>>} RolePermissionsMatrix */

/**
 * Users-access module API facade.
 */
export const usersAccessApi = {
  /**
   * @returns {Promise<any>}
   */
  async fetchUsers(filters = {}) {
    return api.fetchUsers(filters)
  },

  /**
   * @param {UsersAccessUserPayload} payload
   * @returns {Promise<any>}
   */
  async createUser(payload) {
    return api.createUser(payload)
  },

  /**
   * @param {UsersAccessUserPayload} payload
   * @returns {Promise<any>}
   */
  async updateUser(payload) {
    return api.updateUser(payload)
  },

  /**
   * @param {number|string} id
   * @param {boolean} isActive
   * @returns {Promise<any>}
   */
  async setUserLifecycle(id, action) {
    return api.setUserLifecycle(id, action)
  },

  /**
   * @returns {Promise<any>}
   */
  async fetchRolePermissions() {
    return api.fetchRolePermissions()
  },

  /**
   * @param {RolePermissionsMatrix} rolePermissions
   * @returns {Promise<any>}
   */
  async saveRolePermissions(rolePermissions) {
    return api.saveRolePermissions(rolePermissions)
  },
}
