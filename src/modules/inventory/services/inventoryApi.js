import { api } from '@/services/api'
import { request } from '@/services/apiRequest'

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const inventoryApi = {
  async fetchWarehouses(options = {}) {
    return api.fetchInventoryWarehouses(options)
  },

  async fetchItems(filters = {}) {
    return api.fetchInventoryItems(filters)
  },

  async createItem(payload) {
    return api.createInventoryItem(payload)
  },

  async updateItem(payload) {
    return api.updateInventoryItem(payload)
  },

  async setItemActive(id, isActive) {
    return api.setInventoryItemActive(id, isActive)
  },

  async fetchDocuments(filters = {}) {
    return api.fetchInventoryDocuments(filters)
  },

  async createDocument(payload) {
    return api.createInventoryDocument(payload)
  },

  async patchDocument(payload) {
    return api.patchInventoryDocument(payload)
  },

  async fetchRequests(filters = {}) {
    return api.fetchInventoryRequests(filters)
  },

  async createRequest(payload) {
    return api.createInventoryRequest(payload)
  },

  async patchRequest(payload) {
    return api.patchInventoryRequest(payload)
  },

  async fetchCounts(filters = {}) {
    return api.fetchInventoryCounts(filters)
  },

  async createCount(payload) {
    return api.createInventoryCount(payload)
  },

  async patchCount(payload) {
    return api.patchInventoryCount(payload)
  },

  async fetchReport(filters = {}) {
    return api.fetchInventoryReport(filters)
  },

  async fetchV2Products(filters = {}) {
    return request(`/api/inventory_v2_products.php${buildQuery(filters)}`, { method: 'GET' })
  },

  async createV2Product(payload) {
    return request('/api/inventory_v2_products.php', { method: 'POST', body: JSON.stringify(payload) })
  },

  async updateV2Product(payload) {
    return request('/api/inventory_v2_products.php', { method: 'PUT', body: JSON.stringify(payload) })
  },

  async setV2ProductActive(id, isActive) {
    return request('/api/inventory_v2_products.php', { method: 'PATCH', body: JSON.stringify({ id, isActive }) })
  },

  async fetchV2Warehouses(filters = {}) {
    return request(`/api/inventory_v2_warehouses.php${buildQuery(filters)}`, { method: 'GET' })
  },

  async fetchV2Locations(filters = {}) {
    return request(`/api/inventory_v2_locations.php${buildQuery(filters)}`, { method: 'GET' })
  },

  async fetchV2Lots(filters = {}) {
    return request(`/api/inventory_v2_lots.php${buildQuery(filters)}`, { method: 'GET' })
  },
}
