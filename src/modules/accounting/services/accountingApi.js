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

export const accountingApi = {
  // ─── Fiscal Years ──────────────────────────────────────────────────────────
  async fetchFiscalYears() {
    return request('/api/acc_fiscal_years.php', { method: 'GET' })
  },
  async createFiscalYear(payload) {
    return request('/api/acc_fiscal_years.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async patchFiscalYear(payload) {
    return request('/api/acc_fiscal_years.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // ─── Chart of Accounts ─────────────────────────────────────────────────────
  async fetchAccounts(filters = {}) {
    return request(`/api/acc_accounts.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async createAccount(payload) {
    return request('/api/acc_accounts.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateAccount(payload) {
    return request('/api/acc_accounts.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async patchAccount(payload) {
    return request('/api/acc_accounts.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // ─── Vouchers ──────────────────────────────────────────────────────────────
  async fetchVouchers(filters = {}) {
    return request(`/api/acc_vouchers.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async fetchVoucher(id) {
    return request(`/api/acc_vouchers.php?id=${id}`, { method: 'GET' })
  },
  async createVoucher(payload) {
    return request('/api/acc_vouchers.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async updateVoucher(payload) {
    return request('/api/acc_vouchers.php', { method: 'PUT', body: JSON.stringify(payload) })
  },
  async patchVoucher(payload) {
    return request('/api/acc_vouchers.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // ─── Reports ───────────────────────────────────────────────────────────────
  async fetchReport(filters = {}) {
    return request(`/api/acc_reports.php${buildQuery(filters)}`, { method: 'GET' })
  },

  // ─── Sales Bridge ──────────────────────────────────────────────────────────
  async fetchBridgeStatus() {
    return request('/api/acc_sales_bridge.php', { method: 'GET' })
  },
  async runBridge(payload) {
    return request('/api/acc_sales_bridge.php', { method: 'POST', body: JSON.stringify(payload) })
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  async fetchSetting(key) {
    return request(`/api/acc_settings.php?key=${encodeURIComponent(key)}`, { method: 'GET' })
  },
  async saveSetting(key, value) {
    return request('/api/acc_settings.php', {
      method: 'POST',
      body: JSON.stringify({ key, value: JSON.stringify(value) }),
    })
  },
  async saveBridgeAccountMap(accountMap) {
    return request('/api/acc_settings.php', {
      method: 'POST',
      body: JSON.stringify({ key: 'accounting.bridge.account_map', value: JSON.stringify(accountMap) }),
    })
  },
  async fetchTabVisibility() {
    return request('/api/acc_settings.php?key=accounting.tab_visibility', { method: 'GET' })
  },
  async saveTabVisibility(visibility) {
    return request('/api/acc_settings.php', {
      method: 'POST',
      body: JSON.stringify({ key: 'accounting.tab_visibility', value: JSON.stringify(visibility) }),
    })
  },
}
