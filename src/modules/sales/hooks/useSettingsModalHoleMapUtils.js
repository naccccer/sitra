import { toPN } from '@/utils/helpers';

const HOLE_DECIMAL_FACTOR = 10;
export const DEFAULT_HOLE_DIAMETER_CM = 1;
export const MAX_HOLE_COUNT = 10;
export const HOLE_STEP_CM = 0.1;

const roundCm = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * HOLE_DECIMAL_FACTOR) / HOLE_DECIMAL_FACTOR;
};

const clampMin = (value, min = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, roundCm(numeric));
};

export const parseDimensionCm = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const formatCm = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  const rounded = Math.round(numeric * HOLE_DECIMAL_FACTOR) / HOLE_DECIMAL_FACTOR;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
};

export const formatCmFa = (value) => toPN(formatCm(value));

export const normalizeHole = (hole = {}, index = 0) => {
  const holeId = String(hole.id || `hole_${Date.now()}_${index}`);
  const fromYEdge = hole.fromYEdge === 'bottom' ? 'bottom' : 'top';
  const fromZEdge = hole.fromZEdge === 'right' ? 'right' : 'left';

  return {
    id: holeId,
    diameterCm: clampMin(hole.diameterCm, HOLE_STEP_CM),
    fromYEdge,
    fromZEdge,
    distanceYCm: clampMin(hole.distanceYCm, 0),
    distanceZCm: clampMin(hole.distanceZCm, 0),
  };
};

export const normalizeHoleMap = (holeMap = {}) => {
  const holes = Array.isArray(holeMap?.holes) ? holeMap.holes : [];
  return {
    version: 1,
    holes: holes.slice(0, MAX_HOLE_COUNT).map((hole, index) => normalizeHole(hole, index)),
  };
};

export const getHoleCenterCm = (hole, widthCm, heightCm) => {
  const safeWidth = Math.max(0, Number(widthCm) || 0);
  const safeHeight = Math.max(0, Number(heightCm) || 0);
  const distanceY = Math.max(0, Number(hole?.distanceYCm) || 0);
  const distanceZ = Math.max(0, Number(hole?.distanceZCm) || 0);
  const fromYEdge = hole?.fromYEdge === 'bottom' ? 'bottom' : 'top';
  const fromZEdge = hole?.fromZEdge === 'right' ? 'right' : 'left';

  return {
    centerX: fromZEdge === 'left' ? distanceZ : safeWidth - distanceZ,
    centerY: fromYEdge === 'top' ? distanceY : safeHeight - distanceY,
  };
};

export const validateHoleMap = (holeMap, widthCm, heightCm) => {
  const globalErrors = [];
  const itemErrorsById = {};
  const holes = Array.isArray(holeMap?.holes) ? holeMap.holes : [];

  if (widthCm <= 0 || heightCm <= 0) {
    globalErrors.push('برای ثبت نقشه سوراخ باید عرض و ارتفاع معتبر وارد شود.');
  }

  if (holes.length === 0) {
    globalErrors.push('حداقل یک سوراخ باید ثبت شود.');
  }

  if (holes.length > MAX_HOLE_COUNT) {
    globalErrors.push(`حداکثر ${toPN(MAX_HOLE_COUNT)} سوراخ قابل ثبت است.`);
  }

  let hasOutOfBounds = false;
  holes.forEach((hole, index) => {
    const errors = [];
    const holeId = String(hole?.id || `hole_${index}`);
    const diameterCm = Number(hole?.diameterCm);
    const distanceYCm = Number(hole?.distanceYCm);
    const distanceZCm = Number(hole?.distanceZCm);
    const fromYEdge = hole?.fromYEdge === 'bottom' ? 'bottom' : 'top';
    const fromZEdge = hole?.fromZEdge === 'right' ? 'right' : 'left';

    if (!Number.isFinite(diameterCm) || diameterCm <= 0) {
      errors.push('قطر سوراخ باید بزرگ‌تر از صفر باشد.');
    }

    if (!Number.isFinite(distanceYCm) || distanceYCm < 0) {
      errors.push(`فاصله از ${fromYEdge === 'top' ? 'بالا' : 'پایین'} نمی‌تواند منفی باشد.`);
    }

    if (!Number.isFinite(distanceZCm) || distanceZCm < 0) {
      errors.push(`فاصله از ${fromZEdge === 'left' ? 'چپ' : 'راست'} نمی‌تواند منفی باشد.`);
    }

    if (widthCm > 0 && heightCm > 0 && Number.isFinite(diameterCm) && Number.isFinite(distanceYCm) && Number.isFinite(distanceZCm)) {
      const radius = diameterCm / 2;
      const { centerX, centerY } = getHoleCenterCm(hole, widthCm, heightCm);
      const isInside = centerX - radius >= 0
        && centerX + radius <= widthCm
        && centerY - radius >= 0
        && centerY + radius <= heightCm;

      if (!isInside) {
        hasOutOfBounds = true;
        errors.push('با ابعاد فعلی، سوراخ خارج از محدوده شیشه است.');
      }
    }

    if (errors.length > 0) {
      itemErrorsById[holeId] = errors;
    }
  });

  if (hasOutOfBounds) {
    globalErrors.push('یک یا چند سوراخ با ابعاد فعلی خارج از محدوده است؛ مختصات را اصلاح کنید.');
  }

  return {
    isValid: globalErrors.length === 0 && Object.keys(itemErrorsById).length === 0,
    globalErrors,
    itemErrorsById,
  };
};

export const edgeYLabel = (edge) => (edge === 'bottom' ? 'از پایین' : 'از بالا');
export const edgeZLabel = (edge) => (edge === 'right' ? 'از راست' : 'از چپ');

export const clampHoleValue = clampMin;
