const toNonNegativeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
};

const toPositiveNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return numeric;
};

const toNonNegativeInt = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
};

export const DEFAULT_FACTORY_LIMITS = Object.freeze({
  maxShortSideCm: 0,
  maxLongSideCm: 0,
  minimumChargeEnabled: true,
  minimumChargeThresholdM2: 1,
  minimumBillableAreaM2: 1,
});

export const normalizeFactoryLimits = (factoryLimits = {}) => ({
  maxShortSideCm: toNonNegativeInt(
    factoryLimits?.maxShortSideCm ?? factoryLimits?.maxWidth,
    DEFAULT_FACTORY_LIMITS.maxShortSideCm,
  ),
  maxLongSideCm: toNonNegativeInt(
    factoryLimits?.maxLongSideCm ?? factoryLimits?.maxHeight,
    DEFAULT_FACTORY_LIMITS.maxLongSideCm,
  ),
  minimumChargeEnabled: factoryLimits?.minimumChargeEnabled !== false,
  minimumChargeThresholdM2: toPositiveNumber(
    factoryLimits?.minimumChargeThresholdM2,
    DEFAULT_FACTORY_LIMITS.minimumChargeThresholdM2,
  ),
  minimumBillableAreaM2: toPositiveNumber(
    factoryLimits?.minimumBillableAreaM2,
    DEFAULT_FACTORY_LIMITS.minimumBillableAreaM2,
  ),
});

export const createEmptyJumboRule = (sortOrder = 0) => ({
  id: `jumbo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  shortSideOverCm: 0,
  longSideOverCm: 0,
  adjustmentType: 'percentage',
  adjustmentValue: 0,
  sortOrder,
});

export const normalizeJumboRule = (rule = {}, index = 0) => ({
  id: String(rule?.id || `jumbo-${index + 1}`),
  title: String(rule?.title || '').trim(),
  shortSideOverCm: toNonNegativeInt(rule?.shortSideOverCm ?? rule?.minDim, 0),
  longSideOverCm: toNonNegativeInt(rule?.longSideOverCm, 0),
  adjustmentType: String(rule?.adjustmentType || rule?.type || 'percentage') === 'fixed' ? 'fixed' : 'percentage',
  adjustmentValue: toNonNegativeInt(rule?.adjustmentValue ?? rule?.value ?? rule?.addedPercentage, 0),
  sortOrder: toNonNegativeInt(rule?.sortOrder, index),
});

const compareJumboRules = (left, right) => {
  const leftPrimary = Math.max(left.shortSideOverCm, left.longSideOverCm);
  const rightPrimary = Math.max(right.shortSideOverCm, right.longSideOverCm);
  if (leftPrimary !== rightPrimary) return leftPrimary - rightPrimary;

  const leftSecondary = Math.min(left.shortSideOverCm, left.longSideOverCm);
  const rightSecondary = Math.min(right.shortSideOverCm, right.longSideOverCm);
  if (leftSecondary !== rightSecondary) return leftSecondary - rightSecondary;

  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return String(left.id).localeCompare(String(right.id));
};

export const normalizeJumboRules = (rules = []) => (
  (Array.isArray(rules) ? rules : [])
    .map((rule, index) => normalizeJumboRule(rule, index))
    .sort(compareJumboRules)
    .map((rule, index) => ({ ...rule, sortOrder: index }))
);

export const resolvePricingDimensions = (dimensions = {}, factoryLimits = null) => {
  const widthCm = toNonNegativeNumber(dimensions?.width);
  const heightCm = toNonNegativeNumber(dimensions?.height);
  const hasValidDimensions = widthCm > 0 && heightCm > 0;
  const shortSideCm = hasValidDimensions ? Math.min(widthCm, heightCm) : 0;
  const longSideCm = hasValidDimensions ? Math.max(widthCm, heightCm) : 0;
  const actualAreaM2 = hasValidDimensions ? (widthCm * heightCm) / 10000 : 0;
  const perimeterM = hasValidDimensions ? (2 * (widthCm + heightCm)) / 100 : 0;

  const normalizedLimits = normalizeFactoryLimits(factoryLimits || {});
  const shouldApplyMinimumCharge = (
    normalizedLimits.minimumChargeEnabled
    &&
    actualAreaM2 > 0
    && normalizedLimits.minimumChargeThresholdM2 > 0
    && normalizedLimits.minimumBillableAreaM2 > 0
    && actualAreaM2 < normalizedLimits.minimumChargeThresholdM2
  );

  return {
    widthCm,
    heightCm,
    shortSideCm,
    longSideCm,
    actualAreaM2,
    billableAreaM2: shouldApplyMinimumCharge
      ? Math.max(actualAreaM2, normalizedLimits.minimumBillableAreaM2)
      : actualAreaM2,
    perimeterM,
    hasValidDimensions,
  };
};

export const isFactoryLimitExceeded = (dimensions = {}, factoryLimits = null) => {
  const normalizedLimits = normalizeFactoryLimits(factoryLimits || {});
  const resolvedDimensions = resolvePricingDimensions(dimensions, normalizedLimits);
  if (!resolvedDimensions.hasValidDimensions) return false;

  if (
    normalizedLimits.maxShortSideCm > 0
    && resolvedDimensions.shortSideCm > normalizedLimits.maxShortSideCm
  ) {
    return true;
  }

  if (
    normalizedLimits.maxLongSideCm > 0
    && resolvedDimensions.longSideCm > normalizedLimits.maxLongSideCm
  ) {
    return true;
  }

  return false;
};

const doesJumboRuleMatch = (rule, dimensions) => {
  const hasShortThreshold = rule.shortSideOverCm > 0;
  const hasLongThreshold = rule.longSideOverCm > 0;
  if (!hasShortThreshold && !hasLongThreshold) return false;

  const shortMatched = hasShortThreshold && dimensions.shortSideCm > rule.shortSideOverCm;
  const longMatched = hasLongThreshold && dimensions.longSideCm > rule.longSideOverCm;
  return shortMatched || longMatched;
};

export const findApplicableJumboRule = (dimensions = {}, rules = []) => {
  const normalizedRules = normalizeJumboRules(rules);
  const resolvedDimensions = resolvePricingDimensions(dimensions);
  if (!resolvedDimensions.hasValidDimensions) return null;

  let matchedRule = null;
  normalizedRules.forEach((rule) => {
    if (doesJumboRuleMatch(rule, resolvedDimensions)) {
      matchedRule = rule;
    }
  });

  return matchedRule;
};
