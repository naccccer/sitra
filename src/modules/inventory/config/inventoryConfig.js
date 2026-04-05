const EMPTY_PERMISSIONS = Object.freeze([])

const hasPermission = (permissions, permission) => permissions.includes(permission)
const hasAnyPermission = (permissions, required = []) => required.some((permission) => hasPermission(permissions, permission))
const isVisibleTab = (permissions, tab) => tab.alwaysVisible || hasAnyPermission(permissions, tab.permissions)

export const INVENTORY_TAB_DEFINITIONS = [
  {
    id: 'catalog',
    label: 'کالاها',
    permissions: ['inventory.v2_products.read', 'inventory.v2_lots.read'],
  },
  {
    id: 'operations',
    label: 'عملیات',
    permissions: ['inventory.v2_operations.read'],
  },
  {
    id: 'stock',
    label: 'موجودی و گزارش‌ها',
    permissions: ['inventory.v2_reports.read'],
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    permissions: ['inventory.v2_warehouses.read', 'inventory.v2_locations.read', 'inventory.v2_settings.read'],
  },
  {
    id: 'help',
    label: 'راهنما',
    permissions: [],
    alwaysVisible: true,
  },
]

export const getVisibleInventoryTabs = (permissions = EMPTY_PERMISSIONS) => (
  INVENTORY_TAB_DEFINITIONS.filter((tab) => isVisibleTab(permissions, tab))
)

export const INVENTORY_CATALOG_TABS = [
  { id: 'products', label: 'محصولات' },
  { id: 'lots', label: 'سری‌ها' },
]

export const INVENTORY_STOCK_TABS = [
  { id: 'reports', label: 'گزارش‌ها' },
  { id: 'replenishment', label: 'تامین مجدد' },
]

export const INVENTORY_SETTINGS_TABS = [
  { id: 'warehouses', label: 'انبارها' },
  { id: 'locations', label: 'مکان‌ها' },
]

export const INVENTORY_OPERATION_TYPE_CONFIG = {
  receipt: {
    id: 'receipt',
    label: 'رسید',
    workspaceLabel: 'رسیدها',
    formLabel: 'رسید انبار',
    needsSource: false,
    needsTarget: true,
    visibleInUi: true,
  },
  delivery: {
    id: 'delivery',
    label: 'حواله',
    workspaceLabel: 'حواله‌ها',
    formLabel: 'حواله انبار',
    needsSource: true,
    needsTarget: false,
    visibleInUi: true,
  },
  transfer: {
    id: 'transfer',
    label: 'انتقال',
    workspaceLabel: 'انتقال‌ها',
    formLabel: 'انتقال انبار',
    needsSource: true,
    needsTarget: true,
    visibleInUi: true,
  },
  adjustment: {
    id: 'adjustment',
    label: 'تعدیل',
    workspaceLabel: 'تعدیلات',
    formLabel: 'تعدیل موجودی',
    needsSource: false,
    needsTarget: true,
    visibleInUi: true,
  },
  count: {
    id: 'count',
    label: 'شمارش',
    workspaceLabel: 'شمارش‌ها',
    formLabel: 'شمارش موجودی',
    needsSource: false,
    needsTarget: true,
    visibleInUi: true,
  },
  production_consume: {
    id: 'production_consume',
    label: 'مصرف تولید',
    workspaceLabel: 'مصرف تولید',
    formLabel: 'مصرف تولید',
    needsSource: true,
    needsTarget: false,
    visibleInUi: true,
  },
  production_output: {
    id: 'production_output',
    label: 'خروجی تولید',
    workspaceLabel: 'خروجی تولید',
    formLabel: 'خروجی تولید',
    needsSource: false,
    needsTarget: true,
    visibleInUi: true,
  },
  production_move: {
    id: 'production_move',
    label: 'حرکت تولید',
    workspaceLabel: 'حرکت تولید',
    formLabel: 'حرکت تولید',
    needsSource: true,
    needsTarget: true,
    visibleInUi: false,
    legacy: true,
  },
}

export const INVENTORY_OPERATION_WORKSPACE_TABS = [
  {
    id: 'receipt',
    label: 'رسیدها',
    operationTypeIds: ['receipt'],
  },
  {
    id: 'delivery',
    label: 'حواله‌ها',
    operationTypeIds: ['delivery'],
  },
  {
    id: 'transfer',
    label: 'انتقال‌ها',
    operationTypeIds: ['transfer'],
  },
  {
    id: 'adjustment',
    label: 'تعدیلات',
    operationTypeIds: ['adjustment'],
  },
  {
    id: 'count',
    label: 'شمارش‌ها',
    operationTypeIds: ['count'],
  },
  {
    id: 'production',
    label: 'تولید',
    operationTypeIds: ['production_consume', 'production_output'],
  },
]

export const getInventoryOperationConfig = (operationType) => (
  INVENTORY_OPERATION_TYPE_CONFIG[operationType] ?? INVENTORY_OPERATION_TYPE_CONFIG.receipt
)

export const getInventoryOperationLabel = (operationType) => (
  getInventoryOperationConfig(operationType).label
)

export const getVisibleInventoryOperationTypes = () => (
  Object.values(INVENTORY_OPERATION_TYPE_CONFIG).filter((config) => config.visibleInUi)
)
