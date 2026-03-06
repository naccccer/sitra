import { api } from './api'

const DB_NAME = 'sitra-offline'
const DB_VERSION = 1
const STORE_NAME = 'sales_offline_ops'

const STATUS_PENDING = 'pending'
const STATUS_SYNCING = 'syncing'
const STATUS_AUTH_BLOCKED = 'auth_blocked'
const STATUS_CONFLICT = 'conflict'

const BACKOFF_STEPS_MS = [5000, 15000, 30000, 60000, 120000, 300000, 600000, 900000]

/** @type {Set<(snapshot: QueueSnapshot) => void>} */
const listeners = new Set()

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null
let syncInFlight = false

function hasIndexedDB() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function isOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

function now() {
  return Date.now()
}

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `uuid-${now()}-${Math.random().toString(16).slice(2)}`
}

function getBackoffDelayMs(attemptCount) {
  const index = Math.max(0, Math.min(BACKOFF_STEPS_MS.length - 1, attemptCount - 1))
  return BACKOFF_STEPS_MS[index]
}

/**
 * @typedef {Object} SalesQueueOp
 * @property {string} queueId
 * @property {'create'|'update'|'status'} opType
 * @property {any} payload
 * @property {string} clientRequestId
 * @property {string|null} expectedUpdatedAt
 * @property {boolean} requiresAuth
 * @property {'pending'|'syncing'|'auth_blocked'|'conflict'} status
 * @property {number} attemptCount
 * @property {number} nextAttemptAt
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {string} lastError
 * @property {any} conflict
 */

/**
 * @typedef {Object} QueueSnapshot
 * @property {number} pendingCount
 * @property {number} authBlockedCount
 * @property {number} conflictCount
 * @property {boolean} isSyncing
 * @property {SalesQueueOp | null} firstConflict
 */

function normalizeExpectedUpdatedAt(value) {
  const raw = String(value ?? '').trim()
  return raw === '' ? null : raw
}

function compareByCreatedAt(a, b) {
  return Number(a.createdAt || 0) - Number(b.createdAt || 0)
}

function snapshotFromItems(items, isSyncing = syncInFlight) {
  const pendingCount = items.filter((item) => item.status === STATUS_PENDING).length
  const authBlockedCount = items.filter((item) => item.status === STATUS_AUTH_BLOCKED).length
  const conflicts = items.filter((item) => item.status === STATUS_CONFLICT).sort(compareByCreatedAt)

  return {
    pendingCount,
    authBlockedCount,
    conflictCount: conflicts.length,
    isSyncing,
    firstConflict: conflicts[0] || null,
  }
}

function emitSnapshot(snapshot) {
  for (const listener of listeners) {
    try {
      listener(snapshot)
    } catch {
      // Subscribers should not break the queue lifecycle.
    }
  }
}

function openDb() {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB is not available'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'queueId' })
        store.createIndex('idx_status', 'status', { unique: false })
        store.createIndex('idx_created_at', 'createdAt', { unique: false })
        store.createIndex('idx_next_attempt_at', 'nextAttemptAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'))
    }
  })

  return dbPromise
}

function txRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

async function putOp(op) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const req = store.put(op)
  await txRequestToPromise(req)
}

async function deleteOp(queueId) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const req = store.delete(queueId)
  await txRequestToPromise(req)
}

async function getOp(queueId) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const req = store.get(queueId)
  return txRequestToPromise(req)
}

async function listOps() {
  if (!hasIndexedDB()) return []
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const req = store.getAll()
  const rows = await txRequestToPromise(req)
  return Array.isArray(rows) ? rows.sort(compareByCreatedAt) : []
}

async function refreshAndEmitSnapshot() {
  const items = await listOps()
  const snapshot = snapshotFromItems(items)
  emitSnapshot(snapshot)
  return snapshot
}

async function executeQueueOp(item) {
  if (item.opType === 'create') {
    return api.createOrder({
      ...item.payload,
      clientRequestId: item.clientRequestId,
    })
  }

  if (item.opType === 'update') {
    return api.updateOrder({
      ...item.payload,
      clientRequestId: item.clientRequestId,
      expectedUpdatedAt: normalizeExpectedUpdatedAt(item.expectedUpdatedAt ?? item.payload?.expectedUpdatedAt),
    })
  }

  if (item.opType === 'status') {
    return api.updateOrderStatus(item.payload?.id, item.payload?.status, {
      clientRequestId: item.clientRequestId,
      expectedUpdatedAt: normalizeExpectedUpdatedAt(item.expectedUpdatedAt ?? item.payload?.expectedUpdatedAt),
    })
  }

  throw new Error(`Unsupported queue opType: ${item.opType}`)
}

export function supportsSalesOfflineQueue() {
  return hasIndexedDB()
}

export function subscribeSalesOfflineQueue(listener) {
  listeners.add(listener)
  refreshAndEmitSnapshot().catch(() => {
    emitSnapshot(snapshotFromItems([], false))
  })

  return () => {
    listeners.delete(listener)
  }
}

export async function getSalesOfflineQueueSnapshot() {
  const items = await listOps()
  return snapshotFromItems(items, syncInFlight)
}

export async function enqueueSalesOfflineOperation({
  opType,
  payload,
  requiresAuth = false,
  expectedUpdatedAt = null,
}) {
  if (!hasIndexedDB()) {
    throw new Error('Offline queue is not supported in this browser.')
  }

  const op = {
    queueId: createUuid(),
    opType,
    payload,
    clientRequestId: createUuid(),
    expectedUpdatedAt: normalizeExpectedUpdatedAt(expectedUpdatedAt),
    requiresAuth: Boolean(requiresAuth),
    status: STATUS_PENDING,
    attemptCount: 0,
    nextAttemptAt: now(),
    createdAt: now(),
    updatedAt: now(),
    lastError: '',
    conflict: null,
  }

  await putOp(op)
  await refreshAndEmitSnapshot()
  return op
}

export async function dropSalesOfflineOperation(queueId) {
  await deleteOp(queueId)
  await refreshAndEmitSnapshot()
}

export async function retrySalesOfflineConflict(queueId) {
  const row = await getOp(queueId)
  if (!row || row.status !== STATUS_CONFLICT) return

  const nextExpected = normalizeExpectedUpdatedAt(row?.conflict?.serverOrder?.updatedAt ?? row.expectedUpdatedAt)
  const next = {
    ...row,
    expectedUpdatedAt: nextExpected,
    status: STATUS_PENDING,
    conflict: null,
    lastError: '',
    nextAttemptAt: now(),
    updatedAt: now(),
  }
  await putOp(next)
  await refreshAndEmitSnapshot()
}

export async function syncSalesOfflineQueue({ session, onSyncedOrder } = {}) {
  if (!hasIndexedDB()) {
    return { processed: 0, blockedByAuth: false }
  }
  if (syncInFlight) {
    return { processed: 0, blockedByAuth: false }
  }
  if (!isOnline()) {
    return { processed: 0, blockedByAuth: false }
  }

  syncInFlight = true
  emitSnapshot(await getSalesOfflineQueueSnapshot())
  let processed = 0
  let blockedByAuth = false

  try {
    while (true) {
      const allItems = await listOps()
      const nowTs = now()
      const candidate = allItems.find((item) => {
        if (item.status === STATUS_CONFLICT) return false
        if (item.status !== STATUS_PENDING && item.status !== STATUS_AUTH_BLOCKED) return false
        if (item.nextAttemptAt > nowTs) return false
        if (item.requiresAuth && !session?.authenticated) return false
        return true
      })

      if (!candidate) {
        const hasAuthBlocked = allItems.some((item) => item.status === STATUS_AUTH_BLOCKED)
        blockedByAuth = blockedByAuth || hasAuthBlocked
        break
      }

      const started = {
        ...candidate,
        status: STATUS_SYNCING,
        updatedAt: now(),
      }
      await putOp(started)
      await refreshAndEmitSnapshot()

      try {
        const response = await executeQueueOp(started)
        await deleteOp(started.queueId)
        processed += 1

        if (response?.order && typeof onSyncedOrder === 'function') {
          onSyncedOrder(response.order, started)
        }
        await refreshAndEmitSnapshot()
      } catch (error) {
        const status = Number(error?.status || 0)
        const payload = error?.payload && typeof error.payload === 'object' ? error.payload : null

        if (status === 401 || status === 403) {
          await putOp({
            ...started,
            status: STATUS_AUTH_BLOCKED,
            updatedAt: now(),
            lastError: error?.message || 'Authentication required.',
          })
          blockedByAuth = true
          await refreshAndEmitSnapshot()
          break
        }

        if (status === 409 && payload?.code === 'order_conflict') {
          await putOp({
            ...started,
            status: STATUS_CONFLICT,
            updatedAt: now(),
            lastError: error?.message || 'Order conflict detected.',
            conflict: {
              code: payload?.code || 'order_conflict',
              serverOrder: payload?.serverOrder || null,
            },
          })
          await refreshAndEmitSnapshot()
          continue
        }

        const nextAttemptCount = Number(started.attemptCount || 0) + 1
        const nextDelay = getBackoffDelayMs(nextAttemptCount)
        await putOp({
          ...started,
          status: STATUS_PENDING,
          attemptCount: nextAttemptCount,
          nextAttemptAt: now() + nextDelay,
          updatedAt: now(),
          lastError: error?.message || 'Queue sync failed.',
        })
        await refreshAndEmitSnapshot()
        break
      }
    }
  } finally {
    syncInFlight = false
    await refreshAndEmitSnapshot()
  }

  return { processed, blockedByAuth }
}
