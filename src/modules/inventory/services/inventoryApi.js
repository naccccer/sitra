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
    return request('/api/inventory_v2_products.php', { method: 'PATCH', body: JSON.stringify({ id, isActive, action: isActive ? 'restore' : 'archive' }) })
  },
  async archiveV2Product(id) {
    return request('/api/inventory_v2_products.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'archive' }) })
  },
  async restoreV2Product(id) {
    return request('/api/inventory_v2_products.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'restore' }) })
  },
  async deleteV2Product(id) {
    return request('/api/inventory_v2_products.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'delete' }) })
  },

  async fetchV2Warehouses(filters = {}) {
    return request(`/api/inventory_v2_warehouses.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2Warehouse(payload) {
    return request('/api/inventory_v2_warehouses.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateV2Warehouse(payload) {
    return request('/api/inventory_v2_warehouses.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async setV2WarehouseActive(id, isActive) {
    return request('/api/inventory_v2_warehouses.php', { method: 'PATCH', body: JSON.stringify({ id, isActive, action: isActive ? 'restore' : 'archive' }) })
  },
  async archiveV2Warehouse(id) {
    return request('/api/inventory_v2_warehouses.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'archive' }) })
  },
  async restoreV2Warehouse(id) {
    return request('/api/inventory_v2_warehouses.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'restore' }) })
  },
  async deleteV2Warehouse(id) {
    return request('/api/inventory_v2_warehouses.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'delete' }) })
  },

  async fetchV2Locations(filters = {}) {
    return request(`/api/inventory_v2_locations.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2Location(payload) {
    return request('/api/inventory_v2_locations.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateV2Location(payload) {
    return request('/api/inventory_v2_locations.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async setV2LocationActive(id, isActive) {
    return request('/api/inventory_v2_locations.php', { method: 'PATCH', body: JSON.stringify({ id, isActive, action: isActive ? 'restore' : 'archive' }) })
  },
  async archiveV2Location(id) {
    return request('/api/inventory_v2_locations.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'archive' }) })
  },
  async restoreV2Location(id) {
    return request('/api/inventory_v2_locations.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'restore' }) })
  },
  async deleteV2Location(id) {
    return request('/api/inventory_v2_locations.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'delete' }) })
  },

  async fetchV2Lots(filters = {}) {
    return request(`/api/inventory_v2_lots.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2Lot(payload) {
    return request('/api/inventory_v2_lots.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateV2Lot(payload) {
    return request('/api/inventory_v2_lots.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async setV2LotActive(id, isActive) {
    return request('/api/inventory_v2_lots.php', { method: 'PATCH', body: JSON.stringify({ id, isActive, action: isActive ? 'restore' : 'archive' }) })
  },
  async archiveV2Lot(id) {
    return request('/api/inventory_v2_lots.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'archive' }) })
  },
  async restoreV2Lot(id) {
    return request('/api/inventory_v2_lots.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'restore' }) })
  },
  async deleteV2Lot(id) {
    return request('/api/inventory_v2_lots.php', { method: 'PATCH', body: JSON.stringify({ id, action: 'delete' }) })
  },

  async fetchV2Operations(filters = {}) {
    return request(`/api/inventory_v2_operations.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2Operation(payload) {
    return request('/api/inventory_v2_operations.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateV2Operation(payload) {
    return request('/api/inventory_v2_operations.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async operationAction(payload) {
    return request('/api/inventory_v2_operations.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  async fetchV2Reservations(filters = {}) {
    return request(`/api/inventory_v2_reservations.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2Reservation(payload) {
    return request('/api/inventory_v2_reservations.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async reservationAction(payload) {
    return request('/api/inventory_v2_reservations.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  async fetchV2ReplenishmentRules(filters = {}) {
    return request(`/api/inventory_v2_replenishment.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createV2ReplenishmentRule(payload) {
    return request('/api/inventory_v2_replenishment.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateV2ReplenishmentRule(payload) {
    return request('/api/inventory_v2_replenishment.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async deleteV2ReplenishmentRule(id) {
    return request('/api/inventory_v2_replenishment.php', { method: 'PATCH', body: JSON.stringify({ id }) })
  },
  async getV2ReplenishmentSuggestions() {
    return request('/api/inventory_v2_replenishment.php?action=suggest', { method: 'GET' })
  },

  async fetchV2Settings(key) {
    return request(`/api/inventory_v2_settings.php${buildQuery({ key })}`, { method: 'GET' })
  },
  async saveV2Settings(key, value) {
    return request('/api/inventory_v2_settings.php', { method: 'POST', body: JSON.stringify({ key, value }) })
  },

  async fetchV2Report(reportType, filters = {}) {
    return request(`/api/inventory_v2_reports.php${buildQuery({ report: reportType, ...filters })}`, { method: 'GET' })
  },
}
