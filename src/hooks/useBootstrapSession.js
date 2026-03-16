/**
 * Shared session/bootstrap normalization helpers used by useBootstrap.
 * Keeping these pure makes the hook itself smaller and easier to reason about.
 */
export const EMPTY_SESSION = {
  authenticated: false,
  role: null,
  username: null,
  fullName: null,
  jobTitle: null,
  permissions: [],
  capabilities: {},
  modules: [],
}

/**
 * Returns true for errors that are likely transient (network/timeout) and
 * worth retrying. HTTP errors (status > 0) are not transient.
 */
export function isTransientError(error) {
  if (!error) return false
  if (typeof error?.status === 'number' && error.status > 0) return false
  return true
}

const deriveCapabilitiesFromRole = (role) => {
  const normalizedRole = String(role || '').trim()
  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCustomers: true,
      canManageCatalog: true,
      canManageUsers: true,
      canViewAuditLogs: true,
      canManageProfile: true,
      canManageSystemSettings: normalizedRole === 'admin',
    }
  }

  if (normalizedRole === 'sales') {
    return {
      canAccessDashboard: true,
      canManageOrders: true,
      canManageCustomers: true,
      canManageCatalog: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canManageProfile: false,
      canManageSystemSettings: false,
    }
  }

  return {
    canAccessDashboard: false,
    canManageOrders: false,
    canManageCustomers: false,
    canManageCatalog: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageProfile: false,
    canManageSystemSettings: false,
  }
}

export function normalizeSession(rawSession, fallbackRole = null, bootstrapData = null) {
  const effectiveRole = rawSession?.role || fallbackRole || null
  const permissions = Array.isArray(bootstrapData?.permissions) ? bootstrapData.permissions : []
  const capabilities = bootstrapData?.capabilities && typeof bootstrapData.capabilities === 'object'
    ? bootstrapData.capabilities
    : deriveCapabilitiesFromRole(effectiveRole)
  const modules = Array.isArray(bootstrapData?.modules) ? bootstrapData.modules : []

  if (!rawSession || typeof rawSession !== 'object') {
    return {
      ...EMPTY_SESSION,
      role: effectiveRole,
      username: null,
      fullName: null,
      jobTitle: null,
      permissions,
      capabilities,
      modules,
    }
  }

  return {
    authenticated: Boolean(rawSession.authenticated),
    role: effectiveRole,
    username: rawSession.username || null,
    fullName: rawSession.fullName || null,
    jobTitle: rawSession.jobTitle || null,
    permissions,
    capabilities,
    modules,
  }
}

export function normalizeBootstrapOrders(ordersPayload) {
  if (Array.isArray(ordersPayload)) {
    return {
      items: ordersPayload,
      hasMore: false,
      nextCursor: null,
    }
  }

  if (ordersPayload && typeof ordersPayload === 'object') {
    return {
      items: Array.isArray(ordersPayload.items) ? ordersPayload.items : [],
      hasMore: Boolean(ordersPayload.hasMore),
      nextCursor: ordersPayload.nextCursor ?? null,
    }
  }

  return {
    items: [],
    hasMore: false,
    nextCursor: null,
  }
}
