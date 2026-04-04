import { describe, expect, it } from 'vitest'
import { normalizeOrderFormConfig } from '../../src/modules/sales/components/customer/order-form/orderFormConfigDefaults'
import { normalizeLoadedItem } from '../../src/modules/sales/components/customer/order-form/orderFormUtils'

const CATALOG = {
  glasses: [{ id: 'glass-a' }],
  pvbLogic: [],
  connectors: {
    spacers: [{ id: 'spacer-a' }],
    interlayers: [{ id: 'pvb-a' }],
  },
}

describe('legacy laminate normalization', () => {
  it('normalizes legacy draft config into dynamic laminate arrays', () => {
    const config = normalizeOrderFormConfig({
      laminate: {
        glass1: { glassId: 'glass-a', thick: 6, isSekurit: false, hasEdge: false },
        interlayerId: 'pvb-a',
        glass2: { glassId: 'glass-a', thick: 8, isSekurit: false, hasEdge: true },
      },
    }, CATALOG)

    expect(config.laminate.layers).toHaveLength(2)
    expect(config.laminate.layers[0].thick).toBe(6)
    expect(config.laminate.layers[1].hasEdge).toBe(true)
    expect(config.laminate.interlayerIds).toEqual(['pvb-a'])
  })

  it('normalizes legacy laminate order items when editing existing orders', () => {
    const item = normalizeLoadedItem({
      id: 1,
      itemType: 'catalog',
      activeTab: 'laminate',
      title: 'شیشه لمینت',
      dimensions: { width: '100', height: '100', count: 1 },
      unitPrice: 1000,
      totalPrice: 1000,
      config: {
        glass1: { glassId: 'glass-a', thick: 6, isSekurit: false, hasEdge: false },
        interlayerId: 'pvb-a',
        glass2: { glassId: 'glass-a', thick: 6, isSekurit: false, hasEdge: false },
      },
    })

    expect(item.config.layers).toHaveLength(2)
    expect(item.config.interlayerIds).toEqual(['pvb-a'])
  })
})
