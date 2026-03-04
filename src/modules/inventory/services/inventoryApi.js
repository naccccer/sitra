import { api } from '../../../services/api'

export const inventoryApi = {
  /**
   * @param {{status?: string, orderRowKey?: string}=} filters
   * @returns {Promise<any>}
   */
  async fetchReservations(filters = {}) {
    return api.fetchInventoryReservations(filters)
  },

  /**
   * @param {{movementType?: string, orderRowKey?: string}=} filters
   * @returns {Promise<any>}
   */
  async fetchLedger(filters = {}) {
    return api.fetchInventoryLedger(filters)
  },
}

