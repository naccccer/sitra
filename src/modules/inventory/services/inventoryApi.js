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
}
