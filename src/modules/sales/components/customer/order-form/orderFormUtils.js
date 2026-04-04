import {
  buildCatalogPricingMeta,
  buildManualPricingMeta,
} from '@/modules/sales/domain/invoice';
import { normalizeCustomUnitLabel, resolveCustomUnitCode } from '@/utils/customItemUnits';

const DEFAULT_UNIT_LABEL = '\u0639\u062f\u062f';

export const normalizeGlassTitle = (title) => (title || '').toString().trim().toLowerCase();
export const glassProcess = (glass) => glass?.process || 'raw';

export const findMatchingGlassByTitleAndProcess = (currentGlassId, targetProcess, catalog) => {
  const currentGlass = catalog.glasses.find((glass) => glass.id === currentGlassId);
  if (!currentGlass) return null;
  if (glassProcess(currentGlass) === targetProcess) return currentGlass;

  const currentTitle = normalizeGlassTitle(currentGlass.title);
  return catalog.glasses.find((glass) => (
    normalizeGlassTitle(glass.title) === currentTitle && glassProcess(glass) === targetProcess
  )) || null;
};

export const parseIntSafe = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
};

export const parseNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const createEmptyManualDraft = () => ({
  title: '',
  qty: '1',
  unitLabel: DEFAULT_UNIT_LABEL,
  unitPrice: '',
  description: '',
  taxable: true,
  discountType: 'none',
  discountValue: '',
});

const resolveItemType = (item = {}) => {
  if (item.itemType === 'manual') return 'manual';
  if (item.itemType === 'custom') return 'custom';
  return 'catalog';
};

export const normalizeLoadedItem = (item) => {
  if (!item || typeof item !== 'object') return item;

  const itemType = resolveItemType(item);
  const count = Math.max(1, parseIntSafe(item?.dimensions?.count ?? item?.manual?.qty ?? 1, 1));
  const unitPrice = Math.max(0, parseIntSafe(item?.unitPrice ?? 0, 0));
  const totalPrice = Math.max(0, parseIntSafe(item?.totalPrice ?? unitPrice * count, unitPrice * count));
  const pricingMeta = item?.pricingMeta && typeof item.pricingMeta === 'object'
    ? item.pricingMeta
    : (itemType === 'catalog'
      ? buildCatalogPricingMeta({
        catalogUnitPrice: unitPrice,
        count,
        floorPercent: 90,
        overrideUnitPrice: null,
        overrideReason: '',
        discountType: 'none',
        discountValue: 0,
      })
      : buildManualPricingMeta({ qty: count, unitPrice, discountType: 'none', discountValue: 0 }));

  return {
    ...item,
    itemType,
    dimensions: {
      width: item?.dimensions?.width ?? '-',
      height: item?.dimensions?.height ?? '-',
      count,
    },
    unitPrice: Math.max(0, parseIntSafe(pricingMeta.finalUnitPrice ?? unitPrice, unitPrice)),
    totalPrice: Math.max(0, parseIntSafe(pricingMeta.finalLineTotal ?? totalPrice, totalPrice)),
    pricingMeta: {
      catalogUnitPrice: Math.max(0, parseIntSafe(pricingMeta.catalogUnitPrice ?? unitPrice, unitPrice)),
      catalogLineTotal: Math.max(0, parseIntSafe(pricingMeta.catalogLineTotal ?? totalPrice, totalPrice)),
      overrideUnitPrice: pricingMeta.overrideUnitPrice === null || pricingMeta.overrideUnitPrice === ''
        ? null
        : Math.max(0, parseIntSafe(pricingMeta.overrideUnitPrice, 0)),
      overrideAppliedUnitPrice: pricingMeta.overrideAppliedUnitPrice === null || pricingMeta.overrideAppliedUnitPrice === ''
        ? null
        : Math.max(0, parseIntSafe(pricingMeta.overrideAppliedUnitPrice, 0)),
      overrideReason: String(pricingMeta.overrideReason || ''),
      floorUnitPrice: Math.max(0, parseIntSafe(pricingMeta.floorUnitPrice ?? unitPrice, unitPrice)),
      displayFloorUnitPrice: Math.max(0, parseIntSafe(pricingMeta.displayFloorUnitPrice ?? pricingMeta.floorUnitPrice ?? unitPrice, unitPrice)),
      isBelowFloor: Boolean(pricingMeta.isBelowFloor),
      itemDiscountType: pricingMeta.itemDiscountType === 'percent' || pricingMeta.itemDiscountType === 'fixed'
        ? pricingMeta.itemDiscountType
        : 'none',
      itemDiscountValue: Math.max(0, parseIntSafe(pricingMeta.itemDiscountValue ?? 0, 0)),
      itemDiscountAmount: Math.max(0, parseIntSafe(pricingMeta.itemDiscountAmount ?? 0, 0)),
      finalUnitPrice: Math.max(0, parseIntSafe(pricingMeta.finalUnitPrice ?? unitPrice, unitPrice)),
      finalLineTotal: Math.max(0, parseIntSafe(pricingMeta.finalLineTotal ?? totalPrice, totalPrice)),
      pricingUnit: pricingMeta.pricingUnit === 'm_square' ? 'm_square' : 'unit',
      pricingUnitFactor: Math.max(1, Number(pricingMeta.pricingUnitFactor) || 1),
    },
    manual: itemType === 'manual'
      ? {
        qty: count,
        unitLabel: String(item?.manual?.unitLabel || DEFAULT_UNIT_LABEL),
        description: String(item?.manual?.description || ''),
        taxable: Boolean(item?.manual?.taxable ?? true),
      }
      : undefined,
    custom: itemType === 'custom'
      ? {
        id: String(item?.custom?.id || item?.config?.customItemId || ''),
        title: String(item?.custom?.title || item?.title || ''),
        unitLabel: normalizeCustomUnitLabel(item?.custom?.unitLabel || item?.config?.unitLabel || DEFAULT_UNIT_LABEL),
        unitCode: resolveCustomUnitCode(item?.custom?.unitLabel || item?.config?.unitLabel || DEFAULT_UNIT_LABEL),
        baseUnitPrice: Math.max(0, parseIntSafe(item?.custom?.baseUnitPrice ?? unitPrice, 0)),
      }
      : undefined,
  };
};
