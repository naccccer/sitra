import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { salesApi } from '../../src/modules/sales/services/salesApi'
import { api } from '../../src/services/api'
import { enqueueSalesOfflineOperation, supportsSalesOfflineQueue } from '../../src/services/salesOfflineQueue'

vi.mock('../../src/services/api', () => ({
  api: {
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    deleteOrder: vi.fn(),
    uploadPatternFile: vi.fn(),
    uploadReceiptFile: vi.fn(),
  },
}))

vi.mock('../../src/services/salesOfflineQueue', () => ({
  enqueueSalesOfflineOperation: vi.fn(),
  supportsSalesOfflineQueue: vi.fn(() => false),
}))

vi.mock('../../src/utils/uuid', () => ({
  generateUUIDv4: vi.fn(() => 'uuid-fixed-123'),
}))

describe('salesApi integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createOrder sends sanitized payload and generated clientRequestId', async () => {
    vi.mocked(api.createOrder).mockResolvedValue({ order: { id: '9' } })

    await salesApi.createOrder({
      customerName: 'Test',
      phone: '0912',
      date: '1405/01/01',
      items: [
        {
          id: 'item-1',
          title: 'Glass',
          quantity: 1,
          pattern: { type: 'image', previewDataUrl: 'data:image/png;base64,abc' },
        },
      ],
    })

    expect(api.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Test',
        items: [
          expect.objectContaining({
            pattern: expect.not.objectContaining({ previewDataUrl: expect.any(String) }),
          }),
        ],
      }),
      { clientRequestId: 'uuid-fixed-123' },
    )
  })

  it('updateOrder uses updatedAt as optimistic concurrency fallback', async () => {
    vi.mocked(api.updateOrder).mockResolvedValue({ order: { id: '5' } })

    await salesApi.updateOrder({
      id: 5,
      customerName: 'Edit',
      phone: '0912',
      date: '1405/01/01',
      items: [],
      updatedAt: '2026-03-11T10:00:00Z',
    })

    expect(api.updateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5 }),
      {
        clientRequestId: 'uuid-fixed-123',
        expectedUpdatedAt: '2026-03-11T10:00:00Z',
      },
    )
  })

  it('updateOrderStatus forwards expectedUpdatedAt option', async () => {
    vi.mocked(api.updateOrderStatus).mockResolvedValue({ order: { id: '5', status: 'processing' } })

    await salesApi.updateOrderStatus(5, 'processing', {
      expectedUpdatedAt: '2026-03-11T10:05:00Z',
    })

    expect(api.updateOrderStatus).toHaveBeenCalledWith(5, 'processing', {
      clientRequestId: 'uuid-fixed-123',
      expectedUpdatedAt: '2026-03-11T10:05:00Z',
    })
  })

  it('queues create operation when offline queue is supported and browser is offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    })

    vi.mocked(supportsSalesOfflineQueue).mockReturnValue(true)
    vi.mocked(enqueueSalesOfflineOperation).mockResolvedValue({ queueId: 'q1', opType: 'create' })

    const result = await salesApi.createOrder({
      customerName: 'Offline',
      phone: '0912',
      date: '1405/01/01',
      items: [],
    })

    expect(enqueueSalesOfflineOperation).toHaveBeenCalledWith(expect.objectContaining({ opType: 'create' }))
    expect(result.queued).toBe(true)
  })
})

