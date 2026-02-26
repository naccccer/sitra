import { api } from '../../../services/api'

/**
 * Master-data module API facade.
 */
export const masterDataApi = {
  /**
   * @param {Object} catalog
   * @returns {Promise<any>}
   */
  async saveCatalog(catalog) {
    return api.saveCatalog(catalog)
  },
}

