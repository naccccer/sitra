import { api } from '../../../services/api'
import { enqueueSalesOfflineOperation, supportsSalesOfflineQueue } from '../../../services/salesOfflineQueue'

function createClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isOffline() {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

function isRetriableOfflineError(error) {
  if (!error) return false
  if (typeof error?.status === 'number' && error.status > 0) return false
  const message = String(error?.message || '').toLowerCase()
  return message.includes('network') || message.includes('timed out') || message.includes('failed to fetch')
}

function formatNowIso() {
  return new Date().toISOString()
}

function createQueuedOrderPreview(payload, queueItem) {
  const items = Array.isArray(payload?.items) ? payload.items : []
  const totalFromPayload = Number(payload?.total || 0)
  const totalFallback = items.reduce((sum, item) => sum + Number(item?.totalPrice || 0), 0)
  const total = Math.max(0, Number.isFinite(totalFromPayload) ? totalFromPayload : totalFallback)
  const nowIso = formatNowIso()

  return {
    id: `offline:${queueItem.queueId}`,
    orderCode: 'در انتظار همگام‌سازی',
    customerName: String(payload?.customerName || ''),
    phone: String(payload?.phone || ''),
    date: String(payload?.date || ''),
    total,
    status: String(payload?.status || 'pending'),
    items,
    financials: payload?.financials || null,
    payments: Array.isArray(payload?.payments) ? payload.payments : [],
    invoiceNotes: String(payload?.invoiceNotes || ''),
    createdAt: nowIso,
    updatedAt: nowIso,
    offlineQueued: true,
    offlineQueueId: queueItem.queueId,
  }
}

/**
 * Sales module API facade.
 * Keeps UI code decoupled from global API client shape.
 */
export const salesApi = {
  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async createOrder(payload) {
    const clientRequestId = createClientRequestId()
    const requiresAuth = Boolean(
      payload?.financials
      || (Array.isArray(payload?.payments) && payload.payments.length > 0)
      || String(payload?.invoiceNotes || '').trim() !== '',
    )

    if (isOffline() && supportsSalesOfflineQueue()) {
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'create',
        payload,
        requiresAuth,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        order: createQueuedOrderPreview(payload, queueItem),
      }
    }

    try {
      return await api.createOrder(payload, { clientRequestId })
    } catch (error) {
      if (!supportsSalesOfflineQueue() || !isRetriableOfflineError(error)) {
        throw error
      }
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'create',
        payload,
        requiresAuth,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        order: createQueuedOrderPreview(payload, queueItem),
      }
    }
  },

  /**
   * @param {Object} payload
   * @returns {Promise<any>}
   */
  async updateOrder(payload) {
    const clientRequestId = createClientRequestId()
    const expectedUpdatedAt = typeof payload?.expectedUpdatedAt === 'string'
      ? payload.expectedUpdatedAt
      : (typeof payload?.updatedAt === 'string' ? payload.updatedAt : null)

    if (isOffline() && supportsSalesOfflineQueue()) {
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'update',
        payload,
        requiresAuth: true,
        expectedUpdatedAt,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        queuedAt: formatNowIso(),
      }
    }

    try {
      return await api.updateOrder(payload, {
        clientRequestId,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
      })
    } catch (error) {
      if (!supportsSalesOfflineQueue() || !isRetriableOfflineError(error)) {
        throw error
      }
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'update',
        payload,
        requiresAuth: true,
        expectedUpdatedAt,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        queuedAt: formatNowIso(),
      }
    }
  },

  /**
   * @param {number|string} id
   * @param {'pending'|'processing'|'delivered'|'archived'} status
   * @param {{ expectedUpdatedAt?: string | null }} [options]
   * @returns {Promise<any>}
   */
  async updateOrderStatus(id, status, options = {}) {
    const clientRequestId = createClientRequestId()
    const expectedUpdatedAt = typeof options?.expectedUpdatedAt === 'string' ? options.expectedUpdatedAt : null
    const payload = { id, status, expectedUpdatedAt }

    if (isOffline() && supportsSalesOfflineQueue()) {
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'status',
        payload,
        requiresAuth: true,
        expectedUpdatedAt,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        queuedAt: formatNowIso(),
      }
    }

    try {
      return await api.updateOrderStatus(id, status, {
        clientRequestId,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
      })
    } catch (error) {
      if (!supportsSalesOfflineQueue() || !isRetriableOfflineError(error)) {
        throw error
      }
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'status',
        payload,
        requiresAuth: true,
        expectedUpdatedAt,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        queuedAt: formatNowIso(),
      }
    }
  },

  /**
   * @param {number|string} id
   * @returns {Promise<any>}
   */
  async deleteOrder(id) {
    return api.deleteOrder(id)
  },

  /**
   * @param {File} file
   * @returns {Promise<any>}
   */
  async uploadPatternFile(file) {
    return api.uploadPatternFile(file)
  },

  /**
   * @param {File} file
   * @returns {Promise<any>}
   */
  async uploadReceiptFile(file) {
    return api.uploadReceiptFile(file)
  },
}
