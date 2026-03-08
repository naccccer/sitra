/**
 * Tests for salesOfflineQueue.js — the offline sync state machine.
 *
 * Uses fake-indexeddb so no real IndexedDB is needed.
 * api.js is mocked at the top level so sync tests can control responses.
 *
 * Between tests, we clear the object store via an independent IDB connection
 * rather than resetting the module (which avoids the dbPromise/syncInFlight
 * module-state isolation problem while keeping tests fast).
 */

import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock api.js — must be declared before the module import (vi.mock is hoisted)
// ---------------------------------------------------------------------------

vi.mock('../../src/services/api', () => ({
  api: {
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}))

import {
  enqueueSalesOfflineOperation,
  dropSalesOfflineOperation,
  getSalesOfflineQueueSnapshot,
  syncSalesOfflineQueue,
  subscribeSalesOfflineQueue,
  retrySalesOfflineConflict,
  supportsSalesOfflineQueue,
} from '../../src/services/salesOfflineQueue'

import { api } from '../../src/services/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'sitra-offline'
const STORE_NAME = 'sales_offline_ops'

/** Read all raw ops from the IDB store. */
async function readAllOps() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = () => {
      const db = req.result
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const getAll = tx.objectStore(STORE_NAME).getAll()
        getAll.onsuccess = () => {
          db.close()
          resolve(getAll.result || [])
        }
        getAll.onerror = () => {
          db.close()
          resolve([])
        }
      } catch {
        db.close()
        resolve([])
      }
    }
    req.onerror = () => resolve([])
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queueId' })
      }
    }
  })
}

/** Clear all ops from the IDB store between tests. */
async function clearStore() {
  await new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = () => {
      const db = req.result
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          resolve()
        }
      } catch {
        db.close()
        resolve()
      }
    }
    req.onerror = () => resolve()
    // DB may not exist yet on the first test — that's fine
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queueId' })
      }
    }
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  await clearStore()
})

// ---------------------------------------------------------------------------
// Backoff constants
// ---------------------------------------------------------------------------

describe('backoff schedule', () => {
  it('documents the correct 8-step backoff contract', () => {
    const EXPECTED_STEPS_S = [5, 15, 30, 60, 120, 300, 600, 900]
    const EXPECTED_STEPS_MS = EXPECTED_STEPS_S.map((s) => s * 1000)
    // Living specification — these values are referenced in AGENTS.md and the plan.
    expect(EXPECTED_STEPS_MS).toEqual([5000, 15000, 30000, 60000, 120000, 300000, 600000, 900000])
  })
})

// ---------------------------------------------------------------------------
// supportsSalesOfflineQueue
// ---------------------------------------------------------------------------

describe('supportsSalesOfflineQueue', () => {
  it('returns true when IndexedDB is available', () => {
    expect(supportsSalesOfflineQueue()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Enqueue + Snapshot
// ---------------------------------------------------------------------------

describe('enqueueSalesOfflineOperation', () => {
  it('creates an op with status pending', async () => {
    const op = await enqueueSalesOfflineOperation({
      opType: 'create',
      payload: { customerName: 'Ali' },
    })

    expect(op.status).toBe('pending')
    expect(op.opType).toBe('create')
    expect(op.queueId).toBeTruthy()
    expect(op.clientRequestId).toBeTruthy()
  })

  it('snapshot reflects enqueued op', async () => {
    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.pendingCount).toBe(1)
    expect(snap.conflictCount).toBe(0)
    expect(snap.authBlockedCount).toBe(0)
    expect(snap.isSyncing).toBe(false)
  })

  it('generates unique queueId and clientRequestId per op', async () => {
    const op1 = await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    const op2 = await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })

    expect(op1.queueId).not.toBe(op2.queueId)
    expect(op1.clientRequestId).not.toBe(op2.clientRequestId)
  })
})

// ---------------------------------------------------------------------------
// Drop
// ---------------------------------------------------------------------------

describe('dropSalesOfflineOperation', () => {
  it('removes the op from the queue', async () => {
    const op = await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    await dropSalesOfflineOperation(op.queueId)

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.pendingCount).toBe(0)
  })

  it('is a no-op for unknown queueId', async () => {
    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    await dropSalesOfflineOperation('nonexistent-id')

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.pendingCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Retry conflict
// ---------------------------------------------------------------------------

describe('retrySalesOfflineConflict', () => {
  it('is a no-op when op status is not conflict', async () => {
    const op = await enqueueSalesOfflineOperation({ opType: 'update', payload: { id: '1' } })

    // op is pending, not conflict — retry should silently no-op
    await retrySalesOfflineConflict(op.queueId)

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.pendingCount).toBe(1)
    expect(snap.conflictCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Sync: empty queue
// ---------------------------------------------------------------------------

describe('syncSalesOfflineQueue — empty queue', () => {
  it('returns processed=0 when queue is empty', async () => {
    const result = await syncSalesOfflineQueue({ session: { authenticated: true } })
    expect(result.processed).toBe(0)
    expect(result.blockedByAuth).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Sync: success path
// ---------------------------------------------------------------------------

describe('syncSalesOfflineQueue — success', () => {
  it('processes a pending create op and removes it from the queue', async () => {
    vi.mocked(api.createOrder).mockResolvedValue({ order: { id: '99', status: 'pending' } })

    await enqueueSalesOfflineOperation({ opType: 'create', payload: { customerName: 'Test' } })

    const onSyncedOrder = vi.fn()
    const result = await syncSalesOfflineQueue({
      session: { authenticated: true },
      onSyncedOrder,
    })

    expect(result.processed).toBe(1)
    expect(result.blockedByAuth).toBe(false)

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.pendingCount).toBe(0)

    expect(onSyncedOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: '99' }),
      expect.any(Object),
    )
  })
})

// ---------------------------------------------------------------------------
// Sync: auth blocked
// ---------------------------------------------------------------------------

describe('syncSalesOfflineQueue — auth blocked', () => {
  it('marks op as auth_blocked on 401 and stops processing', async () => {
    vi.mocked(api.createOrder).mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    )

    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })

    const result = await syncSalesOfflineQueue({ session: { authenticated: true } })

    expect(result.blockedByAuth).toBe(true)

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.authBlockedCount).toBe(1)
    expect(snap.pendingCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Sync: conflict
// ---------------------------------------------------------------------------

describe('syncSalesOfflineQueue — conflict', () => {
  it('marks op as conflict on 409 order_conflict', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      status: 409,
      payload: {
        code: 'order_conflict',
        serverOrder: { id: '1', updatedAt: '2024-01-01T00:00:00Z' },
      },
    })
    vi.mocked(api.updateOrder).mockRejectedValue(conflictError)

    await enqueueSalesOfflineOperation({ opType: 'update', payload: { id: '1' } })

    await syncSalesOfflineQueue({ session: { authenticated: true } })

    const snap = await getSalesOfflineQueueSnapshot()
    expect(snap.conflictCount).toBe(1)
    expect(snap.firstConflict).not.toBeNull()
    expect(snap.firstConflict.conflict.code).toBe('order_conflict')
  })
})

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

describe('subscribeSalesOfflineQueue', () => {
  it('calls listener immediately on subscribe', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSalesOfflineQueue(listener)

    // Give the async initial snapshot emit time to resolve
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('calls listener again on enqueue', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSalesOfflineQueue(listener)

    await new Promise((resolve) => setTimeout(resolve, 50))
    const callsBefore = listener.mock.calls.length

    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(listener.mock.calls.length).toBeGreaterThan(callsBefore)
    unsubscribe()
  })
})

// ---------------------------------------------------------------------------
// Error code capture in lastError
// ---------------------------------------------------------------------------

describe('syncSalesOfflineQueue — error code in lastError', () => {
  it('prefixes lastError with error code on auth_blocked', async () => {
    const authError = Object.assign(new Error('Session expired'), {
      status: 401,
      code: 'session_expired',
    })
    vi.mocked(api.createOrder).mockRejectedValue(authError)

    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    await syncSalesOfflineQueue({ session: { authenticated: true } })

    const ops = await readAllOps()
    const blocked = ops.find((op) => op.status === 'auth_blocked')
    expect(blocked?.lastError).toMatch(/\[session_expired\]/)
    expect(blocked?.lastError).toContain('Session expired')
  })

  it('omits code prefix when error has no code', async () => {
    const bareError = Object.assign(new Error('Unknown failure'), { status: 401 })
    vi.mocked(api.createOrder).mockRejectedValue(bareError)

    await enqueueSalesOfflineOperation({ opType: 'create', payload: {} })
    await syncSalesOfflineQueue({ session: { authenticated: true } })

    const ops = await readAllOps()
    const blocked = ops.find((op) => op.status === 'auth_blocked')
    expect(blocked?.lastError).not.toMatch(/^\[/)
    expect(blocked?.lastError).toContain('Unknown failure')
  })
})
