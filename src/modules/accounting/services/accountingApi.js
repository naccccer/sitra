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

const saveAccountingSetting = (key, value) => request('/api/acc_settings.php', {
  method: 'POST',
  body: JSON.stringify({ key, value: JSON.stringify(value) }),
})

const payrollRequest = (method, payload = {}, query = {}) => request(`/api/acc_payroll.php${buildQuery(query)}`, {
  method,
  body: JSON.stringify(payload),
})

const hrEmployeeRequest = (method, payload = {}, query = {}) => request(`/api/hr_employees.php${buildQuery(query)}`, {
  method,
  body: JSON.stringify(payload),
})

export const accountingApi = {
  async fetchFiscalYears() {
    return request('/api/acc_fiscal_years.php', { method: 'GET' })
  },
  async createFiscalYear(payload) {
    return request('/api/acc_fiscal_years.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async patchFiscalYear(payload) {
    return request('/api/acc_fiscal_years.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

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

  async fetchReport(filters = {}) {
    return request(`/api/acc_reports.php${buildQuery(filters)}`, { method: 'GET' })
  },

  async fetchBridgeStatus() {
    return request('/api/acc_sales_bridge.php', { method: 'GET' })
  },
  async runBridge(payload) {
    return request('/api/acc_sales_bridge.php', { method: 'POST', body: JSON.stringify(payload) })
  },

  async fetchSetting(key) {
    return request(`/api/acc_settings.php?key=${encodeURIComponent(key)}`, { method: 'GET' })
  },
  async saveSetting(key, value) {
    return saveAccountingSetting(key, value)
  },
  async saveBridgeAccountMap(accountMap) {
    return saveAccountingSetting('accounting.bridge.account_map', accountMap)
  },
  async fetchTabVisibility() {
    return request('/api/acc_settings.php?key=accounting.tab_visibility', { method: 'GET' })
  },
  async saveTabVisibility(visibility) {
    return saveAccountingSetting('accounting.tab_visibility', visibility)
  },

  async fetchPayrollPeriods(filters = {}) {
    return request(`/api/acc_payroll.php${buildQuery({ entity: 'period', ...filters })}`, { method: 'GET' })
  },
  async fetchPayrollPeriod(id) {
    return request(`/api/acc_payroll.php${buildQuery({ entity: 'period', id })}`, { method: 'GET' })
  },
  async savePayrollPeriod(payload) {
    return payrollRequest(payload?.id ? 'PUT' : 'POST', { ...payload, entity: 'period' })
  },
  async deletePayrollPeriod(id) {
    return payrollRequest('DELETE', { entity: 'period', id }, { entity: 'period', id })
  },

  async fetchPayrollEmployees(filters = {}) {
    return request(`/api/hr_employees.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async fetchPayrollEmployee(id) {
    return request(`/api/hr_employees.php${buildQuery({ id })}`, { method: 'GET' })
  },
  async savePayrollEmployee(payload) {
    return hrEmployeeRequest(payload?.id ? 'PUT' : 'POST', payload)
  },

  async fetchPayrollPayslips(filters = {}) {
    return request(`/api/acc_payroll.php${buildQuery(filters)}`, { method: 'GET' })
  },
  async fetchPayrollPayslip(id) {
    return request(`/api/acc_payroll.php${buildQuery({ id })}`, { method: 'GET' })
  },
  async fetchPayrollWorkspace(periodId) {
    return request(`/api/acc_payroll.php${buildQuery({ entity: 'workspace', periodId })}`, { method: 'GET' })
  },
  async savePayrollPayslip(payload) {
    return payrollRequest(payload?.id ? 'PUT' : 'POST', payload)
  },
  async runPayrollAction(payload) {
    return request('/api/acc_payroll.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },
  async runPayrollBulkAction(payload) {
    return request('/api/acc_payroll.php', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  async importPayroll(payload) {
    return request('/api/acc_payroll_import.php', { method: 'POST', body: JSON.stringify(payload) })
  },
  async previewPayrollImport(payload) {
    return request('/api/acc_payroll_import.php', { method: 'POST', body: JSON.stringify({ ...payload, dryRun: true }) })
  },
  async uploadPayrollFile(payslipId, file) {
    const formData = new FormData()
    formData.append('payslipId', String(payslipId))
    formData.append('payrollPdf', file)
    return request('/api/acc_payroll_file.php', { method: 'POST', body: formData })
  },

  async fetchPayrollSettings() {
    return request('/api/acc_settings.php?key=accounting.payroll.settings', { method: 'GET' })
  },
  async savePayrollSettings(settings) {
    return saveAccountingSetting('accounting.payroll.settings', settings)
  },
}
