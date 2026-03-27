const EMPTY_PERMISSIONS = Object.freeze([])

export const INVENTORY_TAB_DEFINITIONS = [
  { id: 'dashboard', label: 'داشبورد', permission: null },
  { id: 'products', label: 'محصولات', permission: 'inventory.v2_products.read' },
  { id: 'receipts', label: 'رسیدها', permission: 'inventory.v2_operations.read' },
  { id: 'deliveries', label: 'حواله‌ها', permission: 'inventory.v2_operations.read' },
  { id: 'transfers', label: 'انتقال‌ها', permission: 'inventory.v2_operations.read' },
  { id: 'productionMoves', label: 'حرکت‌های تولید', permission: 'inventory.v2_operations.read' },
  { id: 'adjustments', label: 'تعدیلات', permission: 'inventory.v2_operations.read' },
  { id: 'counts', label: 'شمارش‌ها', permission: 'inventory.v2_operations.read' },
  { id: 'replenishment', label: 'تامین مجدد', permission: 'inventory.v2_reports.read' },
  { id: 'reports', label: 'گزارشات', permission: 'inventory.v2_reports.read' },
  { id: 'settings', label: 'تنظیمات', permission: 'inventory.v2_settings.read' },
]

export const getVisibleInventoryTabs = (permissions = EMPTY_PERMISSIONS) => (
  INVENTORY_TAB_DEFINITIONS.filter((tab) => !tab.permission || permissions.includes(tab.permission))
)

