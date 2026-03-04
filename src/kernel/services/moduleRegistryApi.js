import { api } from '../../services/api'

export const moduleRegistryApi = {
  async fetchModules() {
    return api.fetchModuleRegistry()
  },

  async setModuleEnabled(moduleId, enabled) {
    return api.setModuleEnabled(moduleId, enabled)
  },
}

