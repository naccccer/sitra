import { api } from '../../../services/api'

/**
 * @typedef {Object} ReleaseLineOverride
 * @property {boolean=} requiresDrilling
 * @property {string=} orderRowKey
 * @property {string=} templatePublicSlug
 * @property {string=} publicTemplateUrl
 */

/**
 * @typedef {Object} ReleaseOrderLinesPayload
 * @property {number|string} orderId
 * @property {(number[])=} lineNos
 * @property {Record<string, ReleaseLineOverride>=} lineOverrides
 */

export const productionApi = {
  /**
   * @param {{status?: string, orderRowKey?: string}=} filters
   * @returns {Promise<any>}
   */
  async fetchWorkOrders(filters = {}) {
    return api.fetchProductionWorkOrders(filters)
  },

  /**
   * @param {ReleaseOrderLinesPayload} payload
   * @returns {Promise<any>}
   */
  async releaseOrderLines(payload) {
    return api.releaseOrderLines(payload)
  },

  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async updateWorkOrder(payload) {
    return api.updateProductionWorkOrder(payload)
  },

  /**
   * @param {{workOrderId?: number|string, orderRowKey?: string}} params
   * @returns {Promise<any>}
   */
  async fetchLabelData(params) {
    return api.fetchProductionLabel(params)
  },

  /**
   * @param {{workOrderId?: number|string, orderRowKey?: string, action?: 'preview'|'print', copies?: number}} payload
   * @returns {Promise<any>}
   */
  async printLabel(payload) {
    return api.printProductionLabel(payload)
  },
}
