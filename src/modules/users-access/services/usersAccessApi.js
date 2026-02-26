import { api } from '../../../services/api'

/**
 * Users-access module API facade.
 */
export const usersAccessApi = {
  /**
   * @returns {Promise<any>}
   */
  async fetchUsers() {
    return api.fetchUsers()
  },

  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async createUser(payload) {
    return api.createUser(payload)
  },

  /**
   * @param {Object} payload
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
  async setUserActive(id, isActive) {
    return api.setUserActive(id, isActive)
  },
}

