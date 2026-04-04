import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePricingCalculator } from '../../src/modules/sales/hooks/usePricingCalculator'

const GLASS_A = { id: 'glass-a', title: 'فلوت ساده', process: 'raw', prices: { 6: 50000 } }
const GLASS_B = { id: 'glass-b', title: 'فلوت برنز', process: 'raw', prices: { 6: 60000 } }
const PVB_A = { id: 'pvb-a', title: 'PVB شفاف', price: 10000, unit: 'm_square' }
const PVB_B = { id: 'pvb-b', title: 'PVB مات', price: 15000, unit: 'm_square' }

const BASE_CATALOG = {
  glasses: [GLASS_A, GLASS_B],
  operations: [],
  connectors: { interlayers: [PVB_A, PVB_B], spacers: [] },
  fees: {
    laminating: { unit: 'qty', price: 2000, fixedOrderPrice: 5000 },
    edgeWork: { unit: 'fixed', price: 0 },
  },
  jumboRules: [],
  roundStep: 1000,
  factoryLimits: null,
}

const DIMENSIONS = { width: '100', height: '100', count: '1' }

const renderPricing = (config, catalog = BASE_CATALOG) => {
  const { result } = renderHook(() => usePricingCalculator(DIMENSIONS, 'laminate', config, catalog))
  return result.current
}

const buildLaminateConfig = (layerCount, extraLayerPatch = () => ({})) => ({
  laminate: {
    layers: Array.from({ length: layerCount }, (_, index) => ({
      glassId: index % 2 === 0 ? GLASS_A.id : GLASS_B.id,
      thick: 6,
      isSekurit: false,
      hasEdge: false,
      ...extraLayerPatch(index),
    })),
    interlayerIds: Array.from({ length: layerCount - 1 }, (_, index) => (index % 2 === 0 ? PVB_A.id : PVB_B.id)),
  },
  operations: {},
  pattern: { type: 'none' },
})

describe('laminate pricing with dynamic layers', () => {
  it.each([
    [3, 194000],
    [4, 266000],
    [5, 333000],
  ])('prices %i-layer laminate assemblies correctly', (layerCount, expectedUnitPrice) => {
    const result = renderPricing(buildLaminateConfig(layerCount))
    expect(result.validationErrors).toEqual([])
    expect(result.pricingDetails.unitPrice).toBe(expectedUnitPrice)
  })

  it('does not surface interlayer validation errors to the user', () => {
    const result = renderPricing({
      ...buildLaminateConfig(3),
      laminate: {
        layers: buildLaminateConfig(3).laminate.layers,
        interlayerIds: ['pvb-a', 'deleted-pvb'],
      },
    })

    expect(result.validationErrors).toEqual([])
  })

  it('counts edge work across all laminate layers', () => {
    const catalog = {
      ...BASE_CATALOG,
      fees: {
        ...BASE_CATALOG.fees,
        edgeWork: { unit: 'fixed', price: 1000 },
      },
    }
    const result = renderPricing(buildLaminateConfig(3, () => ({ hasEdge: true })), catalog)

    expect(result.pricingDetails.unitPrice).toBe(197000)
  })
})
