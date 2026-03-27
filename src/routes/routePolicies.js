export const MASTER_DATA_ROUTE_POLICIES = [
  {
    path: 'pricing',
    capability: 'canManageCatalog',
    moduleId: 'master-data',
    view: 'pricing',
    label: 'قیمت‌گذاری',
  },
  {
    path: 'profile',
    capability: 'canManageProfile',
    moduleId: 'master-data',
    view: 'profile',
    label: 'پروفایل کسب‌وکار',
  },
]

export const MANAGEMENT_ROUTE_POLICIES = [
  {
    path: 'audit',
    capability: 'canViewAuditLogs',
    moduleId: null,
    view: 'audit',
    label: 'ممیزی فعالیت‌ها',
  },
]
