export const CUSTOM_UNIT_LABEL_M_SQUARE = '\u0645\u062a\u0631 \u0645\u0631\u0628\u0639';
export const CUSTOM_UNIT_LABEL_QTY = '\u0639\u062f\u062f';
export const CUSTOM_UNIT_LABEL_M_LENGTH = '\u0645\u062a\u0631 \u0637\u0648\u0644';

export const CUSTOM_UNIT_OPTIONS = [
  { code: 'm_square', label: CUSTOM_UNIT_LABEL_M_SQUARE },
  { code: 'qty', label: CUSTOM_UNIT_LABEL_QTY },
  { code: 'm_length', label: CUSTOM_UNIT_LABEL_M_LENGTH },
];

const UNIT_ALIASES = {
  m_square: 'm_square',
  'm2': 'm_square',
  'm²': 'm_square',
  [CUSTOM_UNIT_LABEL_M_SQUARE]: 'm_square',
  qty: 'qty',
  count: 'qty',
  [CUSTOM_UNIT_LABEL_QTY]: 'qty',
  m_length: 'm_length',
  length: 'm_length',
  [CUSTOM_UNIT_LABEL_M_LENGTH]: 'm_length',
};

export const resolveCustomUnitCode = (unitLabel = '') => {
  const raw = String(unitLabel || '').trim();
  if (raw === '') return 'm_square';
  const lowered = raw.toLowerCase();
  return UNIT_ALIASES[raw] || UNIT_ALIASES[lowered] || 'm_square';
};

export const normalizeCustomUnitLabel = (unitLabel = '') => {
  const code = resolveCustomUnitCode(unitLabel);
  if (code === 'qty') return CUSTOM_UNIT_LABEL_QTY;
  if (code === 'm_length') return CUSTOM_UNIT_LABEL_M_LENGTH;
  return CUSTOM_UNIT_LABEL_M_SQUARE;
};

export const isCustomSquareMeterUnit = (unitLabel = '') => resolveCustomUnitCode(unitLabel) === 'm_square';
