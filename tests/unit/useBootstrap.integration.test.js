import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBootstrap } from '../../src/hooks/useBootstrap'
import { api, clearCsrfToken, setCsrfToken } from '../../src/services/api'

vi.mock('../../src/services/api', () => ({
  api: {
    bootstrap: vi.fn(),
    logout: vi.fn(),
  },
  setCsrfToken: vi.fn(),
  clearCsrfToken: vi.fn(),
}))

vi.mock('../../src/services/bootstrapCache', () => ({
  writeBootstrapCache: vi.fn(),
  readBootstrapCache: vi.fn(() => null),
  clearBootstrapCache: vi.fn(),
}))

vi.mock('../../src/services/salesOfflineQueue', () => ({
  getSalesOfflineQueueSnapshot: vi.fn(async () => ({
    pendingCount: 0,
    conflictCount: 0,
    authBlockedCount: 0,
    isSyncing: false,
  })),
  syncSalesOfflineQueue: vi.fn(async () => ({ processed: 0, blockedByAuth: false })),
}))

const authenticatedBootstrap = {
  session: { authenticated: true, role: 'manager', username: 'manager' },
  catalog: { glasses: [], operations: [], connectors: { interlayers: [], spacers: [] }, fees: {} },
  profile: { brandName: 'Sitra' },
  orders: { items: [], hasMore: false, nextCursor: null },
  csrfToken: 'csrf-auth-1',
  permissions: ['sales.orders.read'],
  capabilities: {
    canAccessDashboard: true,
    canManageOrders: true,
    canManageCatalog: true,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageProfile: true,
    canManageSystemSettings: false,
  },
  modules: [
    { id: 'auth', enabled: true },
    { id: 'users-access', enabled: true },
    { id: 'sales', enabled: true },
    { id: 'master-data', enabled: true },
  ],
}

describe('useBootstrap integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hydrates authenticated session and CSRF token from bootstrap payload', async () => {
    vi.mocked(api.bootstrap).mockResolvedValue(authenticatedBootstrap)
    vi.mocked(api.logout).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false)
    })

    expect(setCsrfToken).toHaveBeenCalledWith('csrf-auth-1')
    expect(result.current.session.authenticated).toBe(true)
    expect(result.current.session.role).toBe('manager')
    expect(result.current.session.capabilities.canManageUsers).toBe(false)
  })

  it('derives capabilities from role when bootstrap omits capabilities', async () => {
    vi.mocked(api.bootstrap).mockResolvedValue({
      ...authenticatedBootstrap,
      session: { authenticated: true, role: 'sales', username: 'sales1' },
      capabilities: undefined,
      permissions: undefined,
    })
    vi.mocked(api.logout).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false)
    })

    expect(result.current.session.role).toBe('sales')
    expect(result.current.session.capabilities.canManageOrders).toBe(true)
    expect(result.current.session.capabilities.canManageCatalog).toBe(false)
  })

  it('clears auth state and csrf token on logout', async () => {
    vi.mocked(api.bootstrap).mockResolvedValue(authenticatedBootstrap)
    vi.mocked(api.logout).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false)
    })

    await act(async () => {
      await result.current.handleLogout()
    })

    expect(clearCsrfToken).toHaveBeenCalled()
    expect(result.current.session.authenticated).toBe(false)
    expect(result.current.orders).toEqual([])
  })
})

