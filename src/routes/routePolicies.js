export const SETTINGS_ROUTE_POLICIES = [
  {
    path: 'catalog',
    capability: 'canManageCatalog',
    moduleId: 'master-data',
    view: 'catalog',
  },
  {
    path: 'audit',
    capability: 'canViewAuditLogs',
    moduleId: null,
    view: 'audit',
  },
]

export const SETTINGS_ALIAS_REDIRECTS = [
  { path: 'admin', to: '/management/catalog' },
]
