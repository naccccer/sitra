import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePricingCalculator } from '../../src/modules/sales/hooks/usePricingCalculator';

const GLASS_RAW_6 = { id: 'g-raw-6', title: 'Float', process: 'raw', prices: { '6mm': 50000, '8mm': 70000 } };
const GLASS_SEKURIT_6 = { id: 'g-sek-6', title: 'Float', process: 'sekurit', prices: { '6mm': 90000 } };

const CATALOG_BASE = {
  glasses: [GLASS_RAW_6, GLASS_SEKURIT_6],
  operations: [],
  connectors: { interlayers: [], spacers: [] },
  fees: {},
  jumboRules: [],
  roundStep: 1000,
  factoryLimits: {
    maxShortSideCm: 0,
    maxLongSideCm: 0,
    minimumChargeThresholdM2: 1,
    minimumBillableAreaM2: 1,
  },
};

const DIM_100x100 = { width: '100', height: '100', count: '1' };
const DIM_50x50 = { width: '50', height: '50', count: '1' };
const DIM_10x10 = { width: '10', height: '10', count: '1' };

const CFG_SINGLE = (glassId = GLASS_RAW_6.id, thick = '6mm', extra = {}) => ({
  single: { glassId, thick, ...extra },
  double: null,
  laminate: null,
  operations: {},
  pattern: { type: 'none' },
});

const calc = (dimensions, activeTab, config, catalog = CATALOG_BASE) => {
  const { result } = renderHook(() => usePricingCalculator(dimensions, activeTab, config, catalog));
  return result.current;
};

describe('billable area calculation', () => {
  it('prices a 100x100 cm panel with its actual 1 m2 area', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE());
    expect(result.pricingDetails.unitPrice).toBe(50000);
    expect(result.pricingDetails.effectiveArea).toBe(1);
  });

  it('uses the configured minimum billable area when area is below threshold', () => {
    const result = calc(DIM_50x50, 'single', CFG_SINGLE());
    expect(result.pricingDetails.unitPrice).toBe(50000);
    expect(result.pricingDetails.effectiveArea).toBe(1);
    expect(result.pricingDetails.actualArea).toBe(0.25);
  });

  it('keeps the minimum billable area configurable', () => {
    const result = calc(DIM_10x10, 'single', CFG_SINGLE(), {
      ...CATALOG_BASE,
      factoryLimits: {
        maxShortSideCm: 0,
        maxLongSideCm: 0,
        minimumChargeThresholdM2: 0.25,
        minimumBillableAreaM2: 0.25,
      },
    });

    expect(result.pricingDetails.unitPrice).toBe(13000);
    expect(result.pricingDetails.effectiveArea).toBe(0.25);
  });
});

describe('price rounding', () => {
  it('rounds up to the configured roundStep', () => {
    const result = calc(DIM_50x50, 'single', CFG_SINGLE(GLASS_RAW_6.id, '8mm'));
    expect(result.pricingDetails.unitPrice).toBe(70000);
  });

  it('uses custom roundStep correctly', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE(), {
      ...CATALOG_BASE,
      roundStep: 5000,
    });

    expect(result.pricingDetails.unitPrice).toBe(50000);
  });

  it('multiplies unit price by count for total', () => {
    const result = calc({ ...DIM_100x100, count: '3' }, 'single', CFG_SINGLE());
    expect(result.pricingDetails.total).toBe(result.pricingDetails.unitPrice * 3);
  });
});

describe('validation errors', () => {
  it('returns zero pricing when no glass is selected', () => {
    const result = calc(DIM_100x100, 'single', { single: { glassId: null, thick: '6mm' }, operations: {}, pattern: { type: 'none' } });
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.pricingDetails.unitPrice).toBe(0);
    expect(result.pricingDetails.total).toBe(0);
  });

  it('returns zero pricing when glass ID is missing from catalog', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE('missing-id'));
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.pricingDetails.unitPrice).toBe(0);
  });

  it('returns zero pricing when thickness is missing from glass prices', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE(GLASS_RAW_6.id, '12mm'));
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.pricingDetails.unitPrice).toBe(0);
  });
});

describe('factory limits', () => {
  it('blocks pricing when the long side exceeds the factory limit', () => {
    const result = calc(
      { width: '100', height: '350', count: '1' },
      'single',
      CFG_SINGLE(),
      {
        ...CATALOG_BASE,
        factoryLimits: {
          maxShortSideCm: 120,
          maxLongSideCm: 300,
          minimumChargeThresholdM2: 1,
          minimumBillableAreaM2: 1,
        },
      },
    );

    expect(result.validationErrors[0]).toContain('حداکثر ظرفیت کارخانه');
    expect(result.pricingDetails.unitPrice).toBe(0);
  });

  it('treats rotated input dimensions the same way', () => {
    const rotated = calc(
      { width: '350', height: '100', count: '1' },
      'single',
      CFG_SINGLE(),
      {
        ...CATALOG_BASE,
        factoryLimits: {
          maxShortSideCm: 120,
          maxLongSideCm: 300,
          minimumChargeThresholdM2: 1,
          minimumBillableAreaM2: 1,
        },
      },
    );

    expect(rotated.validationErrors[0]).toContain('حداکثر ظرفیت کارخانه');
    expect(rotated.pricingDetails.unitPrice).toBe(0);
  });
});

describe('jumbo surcharge', () => {
  it('applies a percentage surcharge when the short side threshold is crossed', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE(), {
      ...CATALOG_BASE,
      jumboRules: [{ id: 'j1', shortSideOverCm: 80, longSideOverCm: 0, adjustmentType: 'percentage', adjustmentValue: 20, sortOrder: 0 }],
    });

    expect(result.pricingDetails.unitPrice).toBe(60000);
  });

  it('applies a fixed surcharge when the long side threshold is crossed', () => {
    const result = calc(
      { width: '90', height: '140', count: '1' },
      'single',
      CFG_SINGLE(),
      {
        ...CATALOG_BASE,
        jumboRules: [{ id: 'j1', shortSideOverCm: 0, longSideOverCm: 120, adjustmentType: 'fixed', adjustmentValue: 10000, sortOrder: 0 }],
      },
    );

    expect(result.pricingDetails.unitPrice).toBe(73000);
  });

  it('applies only the last matched jumbo stage after sorting', () => {
    const result = calc(
      { width: '130', height: '210', count: '1' },
      'single',
      CFG_SINGLE(),
      {
        ...CATALOG_BASE,
        jumboRules: [
          { id: 'j2', shortSideOverCm: 120, longSideOverCm: 200, adjustmentType: 'fixed', adjustmentValue: 25000, sortOrder: 1 },
          { id: 'j1', shortSideOverCm: 100, longSideOverCm: 180, adjustmentType: 'percentage', adjustmentValue: 10, sortOrder: 0 },
        ],
      },
    );

    expect(result.pricingDetails.unitPrice).toBe(162000);
  });

  it('does not apply any surcharge when no rule matches', () => {
    const result = calc(DIM_100x100, 'single', CFG_SINGLE(), {
      ...CATALOG_BASE,
      jumboRules: [{ id: 'j1', shortSideOverCm: 200, longSideOverCm: 0, adjustmentType: 'percentage', adjustmentValue: 20, sortOrder: 0 }],
    });

    expect(result.pricingDetails.unitPrice).toBe(50000);
  });
});

describe('operations pricing', () => {
  it('adds qty-based operation cost', () => {
    const result = calc(DIM_100x100, 'single', { ...CFG_SINGLE(), operations: { 'op-drill': 2 } }, {
      ...CATALOG_BASE,
      operations: [{ id: 'op-drill', unit: 'qty', price: 5000 }],
    });

    expect(result.pricingDetails.unitPrice).toBe(60000);
  });
});

describe('zero or missing dimensions', () => {
  it('returns zero pricing when width is zero', () => {
    const result = calc({ width: '0', height: '100', count: '1' }, 'single', CFG_SINGLE());
    expect(result.pricingDetails.unitPrice).toBe(0);
  });

  it('returns zero pricing when height is zero', () => {
    const result = calc({ width: '100', height: '0', count: '1' }, 'single', CFG_SINGLE());
    expect(result.pricingDetails.unitPrice).toBe(0);
  });
});
