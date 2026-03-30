export const ACCOUNTING_TAB_DEFINITIONS = [
  { id: 'vouchers', label: 'اسناد', permission: 'accounting.vouchers.read', configurable: true },
  { id: 'accounts', label: 'سرفصل حساب ها', permission: 'accounting.accounts.read', configurable: true },
  { id: 'trial_balance', label: 'تراز آزمایشی', permission: 'accounting.reports.read', configurable: true },
  { id: 'general_ledger', label: 'دفتر کل', permission: 'accounting.reports.read', configurable: true },
  { id: 'ar_summary', label: 'مانده مشتریان', permission: 'accounting.reports.read', configurable: true },
  { id: 'pnl', label: 'درآمد/هزینه', permission: 'accounting.reports.read', configurable: true },
  { id: 'bridge', label: 'پل فروش', permission: 'accounting.sales_bridge.read', configurable: true },
  { id: 'payroll', label: 'حقوق و دستمزد', permission: 'accounting.payroll.read', configurable: true },
  { id: 'settings', label: 'تنظیمات', permission: 'accounting.fiscal_years.read', configurable: false },
  { id: 'help', label: 'راهنما', permission: null, configurable: false },
]

export const getVisibleAccountingTabs = (permissions = [], isVisible = () => true) => (
  ACCOUNTING_TAB_DEFINITIONS.filter((tab) => {
    if (tab.permission && !permissions.includes(tab.permission)) return false
    if (tab.configurable && !isVisible(tab.id)) return false
    return true
  })
)
