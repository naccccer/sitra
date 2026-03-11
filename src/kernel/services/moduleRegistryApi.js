import { api } from '../../services/api'

/** @typedef {import('../contracts').KernelModuleRegistryItem} KernelModuleRegistryItem */

export const moduleRegistryApi = {
  /**
   * @returns {Promise<{ modules: Array<KernelModuleRegistryItem> }>}
   */
  async fetchModules() {
    return api.fetchModuleRegistry()
  },

  /**
   * @param {string} moduleId
   * @param {boolean} enabled
   * @returns {Promise<{ module: KernelModuleRegistryItem }>}
   */
  async setModuleEnabled(moduleId, enabled) {
    return api.setModuleEnabled(moduleId, enabled)
  },
}
