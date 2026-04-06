import { buildCatalogPricingMeta } from '@/modules/sales/domain/invoice';
import { parseIntSafe } from '@/modules/sales/components/customer/order-form/orderFormUtils';
import { resolvePricingDimensions } from '@/utils/catalogPricing';
import {
  CUSTOM_UNIT_LABEL_M_SQUARE,
  normalizeCustomUnitLabel,
  resolveCustomUnitCode,
} from '@/utils/customItemUnits';

const resolveRoundStep = (catalog) => {
  const parsed = Number(catalog?.roundStep);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
};

const roundByStep = (value, roundStep = 1000) => {
  const numeric = Math.max(0, Number(value) || 0);
  if (numeric <= 0) return 0;
  return Math.ceil(numeric / roundStep) * roundStep;
};

const resolveCustomBaseRate = (selectedCustomItem, customDraft) => {
  const itemRate = Math.max(0, parseIntSafe(selectedCustomItem?.unitPrice ?? 0, 0));
  const draftRate = Math.max(0, parseIntSafe(customDraft?.unitPrice ?? itemRate, itemRate));
  return draftRate > 0 ? draftRate : itemRate;
};

const computeServiceAndPatternUnitExtra = ({ config, catalog, effectiveArea, perimeter, count }) => {
  let unitExtra = 0;

  Object.entries(config?.operations || {}).forEach(([opId, qty]) => {
    const operation = (catalog?.operations || []).find((entry) => String(entry.id) === String(opId));
    if (!operation) return;

    const operationPrice = Math.max(0, Number(operation.price) || 0);
    const operationQty = Math.max(0, Number(qty) || 0);

    if (operation.unit === 'qty') unitExtra += operationPrice * operationQty;
    else if (operation.unit === 'm_length') unitExtra += operationPrice * perimeter;
    else unitExtra += operationPrice * effectiveArea;
  });

  if (config?.pattern?.type && config.pattern.type !== 'none') {
    const patternFee = catalog?.fees?.pattern || {};
    const patternPrice = Math.max(0, Number(patternFee.price) || 0);
    unitExtra += patternFee.unit === 'qty' ? patternPrice * count : patternPrice;
  }

  return unitExtra;
};

export const normalizeCustomCatalogItems = (catalog) => {
  const source = Array.isArray(catalog?.customItems) ? catalog.customItems : [];
  return source
    .map((item) => ({
      id: String(item?.id || ''),
      title: String(item?.title || '').trim(),
      unitLabel: normalizeCustomUnitLabel(item?.unitLabel || CUSTOM_UNIT_LABEL_M_SQUARE),
      unitPrice: Math.max(0, Number(item?.unitPrice) || 0),
      isActive: item?.isActive !== false,
    }))
    .filter((item) => item.id !== '' && item.title !== '');
};

export const createCustomDraft = (items = [], preferredId = '') => {
  const list = Array.isArray(items) ? items : [];
  const resolved = list.find((item) => item.id === String(preferredId || '')) || list[0] || null;
  if (!resolved) return { itemId: '', unitPrice: '' };
  return {
    itemId: resolved.id,
    unitPrice: String(Math.max(0, parseIntSafe(resolved.unitPrice, 0))),
  };
};

export const resolveCustomDraftState = ({
  customItems,
  customDraft,
  dimensions,
  config,
  catalog,
  billing,
  itemPricing,
}) => {
  const list = Array.isArray(customItems) ? customItems : [];
  const selectedCustomItem = list.find((item) => item.id === String(customDraft?.itemId || '')) || null;

  const count = Math.max(1, parseIntSafe(dimensions?.count ?? 1, 1));
  const pricingDimensions = resolvePricingDimensions(dimensions, catalog?.factoryLimits);
  const widthCm = pricingDimensions.widthCm;
  const heightCm = pricingDimensions.heightCm;
  const effectiveArea = pricingDimensions.billableAreaM2;
  const perimeter = pricingDimensions.perimeterM;

  const unitLabel = normalizeCustomUnitLabel(selectedCustomItem?.unitLabel || CUSTOM_UNIT_LABEL_M_SQUARE);
  const unitCode = resolveCustomUnitCode(unitLabel);
  const needsDimensions = unitCode !== 'qty';
  const dimensionsReady = !needsDimensions || pricingDimensions.hasValidDimensions;

  const baseRate = resolveCustomBaseRate(selectedCustomItem, customDraft);
  const metricFactor = unitCode === 'm_square' ? effectiveArea : unitCode === 'm_length' ? perimeter : 1;
  const basePiecePrice = baseRate * metricFactor;
  const serviceAndPatternExtra = unitCode === 'm_square'
    ? computeServiceAndPatternUnitExtra({
      config,
      catalog,
      effectiveArea,
      perimeter,
      count,
    })
    : 0;
  const catalogUnitPrice = roundByStep(basePiecePrice + serviceAndPatternExtra, resolveRoundStep(catalog));

  const pricingMeta = buildCatalogPricingMeta({
    catalogUnitPrice,
    count,
    floorPercent: billing?.priceFloorPercent,
    overrideUnitPrice: itemPricing?.overrideUnitPrice,
    overrideReason: itemPricing?.overrideReason,
    discountType: itemPricing?.discountType,
    discountValue: itemPricing?.discountValue,
    pricingUnit: unitCode === 'm_square' ? 'm_square' : 'unit',
    pricingUnitFactor: metricFactor,
  });

  return {
    selectedCustomItem,
    unitCode,
    unitLabel,
    count,
    widthCm,
    heightCm,
    baseRate,
    metricFactor,
    dimensionsReady,
    dimensionError: dimensionsReady ? '' : 'برای این واحد، عرض و ارتفاع را وارد کنید.',
    pricingMeta,
    canAdd: Boolean(selectedCustomItem) && dimensionsReady && pricingMeta.finalLineTotal > 0,
  };
};

export const buildCustomOrderItemPayload = ({
  customDraft,
  customDraftState,
  dimensions,
  config,
  editingItemType,
  editingItemId,
}) => {
  const hasHoleMap = config?.pattern?.type === 'hole_map'
    && Array.isArray(config?.pattern?.holeMap?.holes)
    && config.pattern.holeMap.holes.length > 0;
  const shouldIncludeSettings = customDraftState.unitCode === 'm_square';
  const normalizedPattern = shouldIncludeSettings
    ? JSON.parse(JSON.stringify(config?.pattern || { type: 'none', fileName: '' }))
    : { type: 'none', fileName: '' };
  const normalizedOperations = shouldIncludeSettings ? { ...(config?.operations || {}) } : {};

  return {
    id: editingItemType === 'custom' && editingItemId ? editingItemId : Date.now(),
    itemType: 'custom',
    title: customDraftState.selectedCustomItem?.title || 'آیتم سفارشی',
    activeTab: 'custom',
    dimensions: {
      width: String(dimensions?.width ?? ''),
      height: String(dimensions?.height ?? ''),
      count: customDraftState.count,
    },
    config: {
      customItemId: String(customDraftState.selectedCustomItem?.id || customDraft?.itemId || ''),
      unitLabel: customDraftState.unitLabel,
      unitCode: customDraftState.unitCode,
    },
    operations: normalizedOperations,
    pattern: normalizedPattern,
    requiresDrilling: shouldIncludeSettings && hasHoleMap,
    unitPrice: customDraftState.pricingMeta.finalUnitPrice,
    totalPrice: customDraftState.pricingMeta.finalLineTotal,
    pricingMeta: { ...customDraftState.pricingMeta },
    custom: {
      id: String(customDraftState.selectedCustomItem?.id || ''),
      title: String(customDraftState.selectedCustomItem?.title || ''),
      unitLabel: customDraftState.unitLabel,
      unitCode: customDraftState.unitCode,
      baseUnitPrice: Math.max(0, parseIntSafe(customDraftState.selectedCustomItem?.unitPrice ?? 0, 0)),
    },
  };
};
