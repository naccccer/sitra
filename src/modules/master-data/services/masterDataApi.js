import { api } from '../../../services/api'

/** @typedef {import('../../../types/api-contracts.generated').CatalogSaveRequest} CatalogSaveRequest */

/**
 * Master-data module API facade.
 */
export const masterDataApi = {
  /**
   * @param {CatalogSaveRequest} catalog
   * @returns {Promise<any>}
   */
  async saveCatalog(catalog) {
    return api.saveCatalog(catalog)
  },
}
