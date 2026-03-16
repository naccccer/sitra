import { api } from '../../../services/api'
import { enqueueSalesOfflineOperation, supportsSalesOfflineQueue } from '../../../services/salesOfflineQueue'
import { generateUUIDv4 } from '../../../utils/uuid'

/** @typedef {import('../../../types/api-contracts.generated').OrdersCreateRequest} OrdersCreateRequest */
/** @typedef {import('../../../types/api-contracts.generated').OrdersUpdateRequest} OrdersUpdateRequest */
/** @typedef {import('../../../types/api-contracts.generated').OrdersStatusPatchRequest} OrdersStatusPatchRequest */

function createClientRequestId() {
  return generateUUIDv4()
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

function sanitizeOrderItemForTransport(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item
  }

  const nextItem = { ...item }
  const pattern = nextItem.pattern
  if (pattern && typeof pattern === 'object' && !Array.isArray(pattern)) {
    const nextPattern = { ...pattern }
    // previewDataUrl is only for local UI preview and can exceed DB packet limits.
    delete nextPattern.previewDataUrl
    nextItem.pattern = nextPattern
  }

  return nextItem
}

function sanitizeOrderPayloadForTransport(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  const nextPayload = { ...payload }
  if (Array.isArray(nextPayload.items)) {
    nextPayload.items = nextPayload.items.map(sanitizeOrderItemForTransport)
  }

  return nextPayload
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
    customerId: payload?.customerId ? String(payload.customerId) : null,
    projectId: payload?.projectId ? String(payload.projectId) : null,
    projectContactId: payload?.projectContactId ? String(payload.projectContactId) : null,
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
   * @param {OrdersCreateRequest} payload
   * @returns {Promise<any>}
   */
  async createOrder(payload) {
    const requestPayload = sanitizeOrderPayloadForTransport(payload)
    const clientRequestId = createClientRequestId()
    const requiresAuth = Boolean(
      requestPayload?.financials
      || (Array.isArray(requestPayload?.payments) && requestPayload.payments.length > 0)
      || String(requestPayload?.invoiceNotes || '').trim() !== '',
    )

    if (isOffline() && supportsSalesOfflineQueue()) {
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'create',
        payload: requestPayload,
        requiresAuth,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        order: createQueuedOrderPreview(requestPayload, queueItem),
      }
    }

    try {
      return await api.createOrder(requestPayload, { clientRequestId })
    } catch (error) {
      if (!supportsSalesOfflineQueue() || !isRetriableOfflineError(error)) {
        throw error
      }
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'create',
        payload: requestPayload,
        requiresAuth,
      })
      return {
        success: true,
        queued: true,
        queueItem,
        order: createQueuedOrderPreview(requestPayload, queueItem),
      }
    }
  },

  /**
   * @param {OrdersUpdateRequest} payload
   * @returns {Promise<any>}
   */
  async updateOrder(payload) {
    const requestPayload = sanitizeOrderPayloadForTransport(payload)
    const clientRequestId = createClientRequestId()
    const expectedUpdatedAt = typeof requestPayload?.expectedUpdatedAt === 'string'
      ? requestPayload.expectedUpdatedAt
      : (typeof requestPayload?.updatedAt === 'string' ? requestPayload.updatedAt : null)

    if (isOffline() && supportsSalesOfflineQueue()) {
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'update',
        payload: requestPayload,
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
      return await api.updateOrder(requestPayload, {
        clientRequestId,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
      })
    } catch (error) {
      if (!supportsSalesOfflineQueue() || !isRetriableOfflineError(error)) {
        throw error
      }
      const queueItem = await enqueueSalesOfflineOperation({
        opType: 'update',
        payload: requestPayload,
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
   * @param {Partial<OrdersStatusPatchRequest>} [options]
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
