/**
 * Tests for usePricingCalculator — the glass pricing hook.
 *
 * The hook is mostly pure computation wrapped in useMemo.
 * We call it via renderHook with known catalog/config inputs
 * and verify the outputs.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePricingCalculator } from '../../src/modules/sales/hooks/usePricingCalculator'

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const GLASS_RAW_6 = { id: 'g-raw-6', title: 'فلوت', process: 'raw', prices: { '6mm': 50000, '8mm': 70000 } }
const GLASS_SEKURIT_6 = { id: 'g-sek-6', title: 'فلوت', process: 'sekurit', prices: { '6mm': 90000 } }

const CATALOG_BASE = {
  glasses: [GLASS_RAW_6, GLASS_SEKURIT_6],
  operations: [],
  connectors: { interlayers: [], spacers: [] },
  fees: {},
  jumboRules: [],
  roundStep: 1000,
  factoryLimits: null,
}

const DIM_100x100 = { width: '100', height: '100', count: '1' }  // 1 m²
const DIM_50x50 = { width: '50', height: '50', count: '1' }    // 0.25 m² (floor)
const DIM_10x10 = { width: '10', height: '10', count: '1' }    // 0.01 m² → clamped to 0.25

const CFG_SINGLE = (glassId = GLASS_RAW_6.id, thick = '6mm', extra = {}) => ({
  single: { glassId, thick, ...extra },
  double: null,
  laminate: null,
  operations: {},
  pattern: { type: 'none' },
})

// ------------------------------------------------------------------
// Helper: call hook and return result
// ------------------------------------------------------------------

function calc(dimensions, activeTab, config, catalog = CATALOG_BASE) {
  const { result } = renderHook(() =>
    usePricingCalculator(dimensions, activeTab, config, catalog),
  )
  return result.current
}

// ------------------------------------------------------------------
// Effective area
// ------------------------------------------------------------------

describe('effective area calculation', () => {
  it('computes area correctly for 100×100 cm (1 m²)', () => {
    const r = calc(DIM_100x100, 'single', CFG_SINGLE())
    // 50000 ✕ 1 m² = 50000, rounded to 1000 step → 50000
    expect(r.pricingDetails.unitPrice).toBe(50000)
  })

  it('clamps area to 0.25 m² minimum (50×50 cm)', () => {
    const r = calc(DIM_50x50, 'single', CFG_SINGLE())
    // 50000 ✕ 0.25 = 12500, round up to 1000 → 13000
    expect(r.pricingDetails.unitPrice).toBe(13000)
  })

  it('clamps very small glass (10×10 cm = 0.01 m²) to 0.25 m²', () => {
    const r = calc(DIM_10x10, 'single', CFG_SINGLE())
    expect(r.pricingDetails.unitPrice).toBe(13000)
  })
})

// ------------------------------------------------------------------
// Price rounding
// ------------------------------------------------------------------

describe('price rounding', () => {
  it('rounds up to roundStep', () => {
    // 70000 ✕ 0.25 m² = 17500; ceil(17500/1000)*1000 = 18000
    const r = calc(DIM_50x50, 'single', CFG_SINGLE(GLASS_RAW_6.id, '8mm'), {
      ...CATALOG_BASE,
      roundStep: 1000,
    })
    expect(r.pricingDetails.unitPrice).toBe(18000)
  })

  it('uses custom roundStep correctly', () => {
    // 50000 ✕ 1 m² = 50000; ceil(50000/5000)*5000 = 50000
    const r = calc(DIM_100x100, 'single', CFG_SINGLE(), {
      ...CATALOG_BASE,
      roundStep: 5000,
    })
    expect(r.pricingDetails.unitPrice).toBe(50000)
  })

  it('total = unitPrice × count', () => {
    const r = calc({ ...DIM_100x100, count: '3' }, 'single', CFG_SINGLE())
    expect(r.pricingDetails.total).toBe(r.pricingDetails.unitPrice * 3)
  })
})

// ------------------------------------------------------------------
// Validation errors → price is zero
// ------------------------------------------------------------------

describe('validation errors', () => {
  it('returns price 0 when no glass is selected', () => {
    const cfg = { single: { glassId: null, thick: '6mm' }, operations: {}, pattern: { type: 'none' } }
    const r = calc(DIM_100x100, 'single', cfg)
    expect(r.validationErrors.length).toBeGreaterThan(0)
    expect(r.pricingDetails.unitPrice).toBe(0)
    expect(r.pricingDetails.total).toBe(0)
  })

  it('returns price 0 when glass ID is not in catalog', () => {
    const cfg = CFG_SINGLE('nonexistent-glass-id')
    const r = calc(DIM_100x100, 'single', cfg)
    expect(r.validationErrors.length).toBeGreaterThan(0)
    expect(r.pricingDetails.unitPrice).toBe(0)
  })

  it('returns price 0 when thickness is not in glass prices', () => {
    const cfg = CFG_SINGLE(GLASS_RAW_6.id, '12mm')  // 12mm not in GLASS_RAW_6.prices
    const r = calc(DIM_100x100, 'single', cfg)
    expect(r.validationErrors.length).toBeGreaterThan(0)
    expect(r.pricingDetails.unitPrice).toBe(0)
  })

  it('reports unavailableLayers when sekurit process mismatches', () => {
    // GLASS_RAW_6 is raw but isSekurit=true → mismatch
    const cfg = CFG_SINGLE(GLASS_RAW_6.id, '6mm', { isSekurit: true })
    const r = calc(DIM_100x100, 'single', cfg)
    expect(r.validationErrors.length).toBeGreaterThan(0)
  })
})

// ------------------------------------------------------------------
// Jumbo surcharge
// ------------------------------------------------------------------

describe('jumbo surcharge', () => {
  it('applies percentage surcharge for large dimensions', () => {
    const catalogWithJumbo = {
      ...CATALOG_BASE,
      jumboRules: [{ minDim: 80, maxDim: 0, type: 'percentage', value: 20 }],
    }
    // 100×100 cm → maxDim = 100 >= 80 → +20%
    // 50000 ✕ 1 m² = 50000 + 20% = 60000
    const r = calc(DIM_100x100, 'single', CFG_SINGLE(), catalogWithJumbo)
    expect(r.pricingDetails.unitPrice).toBe(60000)
  })

  it('applies fixed surcharge for large dimensions', () => {
    const catalogWithJumbo = {
      ...CATALOG_BASE,
      jumboRules: [{ minDim: 80, maxDim: 0, type: 'fixed', value: 10000 }],
    }
    // 50000 + 10000 = 60000
    const r = calc(DIM_100x100, 'single', CFG_SINGLE(), catalogWithJumbo)
    expect(r.pricingDetails.unitPrice).toBe(60000)
  })

  it('does NOT apply surcharge below minDim threshold', () => {
    const catalogWithJumbo = {
      ...CATALOG_BASE,
      jumboRules: [{ minDim: 200, maxDim: 0, type: 'percentage', value: 20 }],
    }
    // 100 cm max dim < 200 → no surcharge
    const r = calc(DIM_100x100, 'single', CFG_SINGLE(), catalogWithJumbo)
    expect(r.pricingDetails.unitPrice).toBe(50000)
  })
})

// ------------------------------------------------------------------
// Operations
// ------------------------------------------------------------------

describe('operations pricing', () => {
  it('adds qty-based operation cost', () => {
    const catalogWithOp = {
      ...CATALOG_BASE,
      operations: [{ id: 'op-drill', unit: 'qty', price: 5000 }],
    }
    const cfg = { ...CFG_SINGLE(), operations: { 'op-drill': 2 } }  // 2 holes
    const r = calc(DIM_100x100, 'single', cfg, catalogWithOp)
    // 50000 (glass) + 10000 (2×5000 drill) = 60000
    expect(r.pricingDetails.unitPrice).toBe(60000)
  })
})

// ------------------------------------------------------------------
// Zero dimensions
// ------------------------------------------------------------------

describe('zero or missing dimensions', () => {
  it('returns unitPrice 0 when width is 0', () => {
    const r = calc({ width: '0', height: '100', count: '1' }, 'single', CFG_SINGLE())
    expect(r.pricingDetails.unitPrice).toBe(0)
  })

  it('returns unitPrice 0 when height is 0', () => {
    const r = calc({ width: '100', height: '0', count: '1' }, 'single', CFG_SINGLE())
    expect(r.pricingDetails.unitPrice).toBe(0)
  })
})
