import { api } from '../../../services/api'

/**
 * @typedef {Object} SalesOrderStatusInput
 * @property {number|string} id
 * @property {'pending'|'processing'|'delivered'|'archived'} status
 */

/**
 * Sales module API facade.
 * Keeps UI code decoupled from global API client shape.
 */
export const salesApi = {
  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async createOrder(payload) {
    return api.createOrder(payload)
  },

  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async updateOrder(payload) {
    return api.updateOrder(payload)
  },

  /**
   * @param {number|string} id
   * @param {'pending'|'processing'|'delivered'|'archived'} status
   * @returns {Promise<any>}
   */
  async updateOrderStatus(id, status) {
    return api.updateOrderStatus(id, status)
  },

  /**
   * @param {number|string} id
   * @returns {Promise<any>}
   */
  async deleteOrder(id) {
    return api.deleteOrder(id)
  },

  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async releaseOrderLines(payload) {
    return api.releaseOrderLines(payload)
  },

  /**
   * @param {File} file
   * @returns {Promise<any>}
   */
  async uploadPatternFile(file) {
    return api.uploadPatternFile(file)
  },

  /**
   * @param {File} file
   * @returns {Promise<any>}
   */
  async uploadReceiptFile(file) {
    return api.uploadReceiptFile(file)
  },
}
