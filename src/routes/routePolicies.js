export const SETTINGS_ROUTE_POLICIES = [
  {
    path: 'catalog',
    capability: 'canManageCatalog',
    moduleId: 'master-data',
    view: 'catalog',
  },
  {
    path: 'profile',
    capability: 'canManageProfile',
    moduleId: 'master-data',
    view: 'profile',
  },
  {
    path: 'users',
    capability: 'canManageUsers',
    moduleId: 'users-access',
    view: 'users',
  },
  {
    path: 'audit',
    capability: 'canViewAuditLogs',
    moduleId: null,
    view: 'audit',
  },
]

export const SETTINGS_ALIAS_REDIRECTS = [
  { path: 'admin', to: '/settings/catalog' },
]
