const toInt = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

const normalizeDiscountType = (type) => (type === 'percent' || type === 'fixed' ? type : 'none');

export const DEFAULT_BILLING = {
  priceFloorPercent: 90,
  taxDefaultEnabled: false,
  taxRate: 10,
  paymentMethods: ['card', 'check', 'cash', 'other'],
};

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'کارت به کارت' },
  { value: 'check', label: 'چک' },
  { value: 'cash', label: 'نقد' },
  { value: 'other', label: 'سایر' },
];

const PAYMENT_METHOD_ALIASES = {
  card: 'card',
  transfer: 'card',
  'کارت به کارت': 'card',
  check: 'check',
  cheque: 'check',
  'چک': 'check',
  cash: 'cash',
  'نقد': 'cash',
  other: 'other',
  'سایر': 'other',
};

export const normalizePaymentMethod = (method = '') => {
  const raw = String(method || '').trim();
  if (raw === '') return 'cash';
  const lowered = raw.toLowerCase();
  return PAYMENT_METHOD_ALIASES[raw] || PAYMENT_METHOD_ALIASES[lowered] || 'other';
};

export const getPaymentMethodLabel = (method = '') => {
  const normalized = normalizePaymentMethod(method);
  const found = PAYMENT_METHOD_OPTIONS.find((option) => option.value === normalized);
  return found ? found.label : 'سایر';
};

export const resolveBillingPaymentMethods = (methods = []) => {
  const src = Array.isArray(methods) ? methods : [];
  const normalized = src
    .map((method) => normalizePaymentMethod(method))
    .filter(Boolean);
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : [...DEFAULT_BILLING.paymentMethods];
};

export const ensureBillingSettings = (catalog = {}) => {
  const src = catalog?.billing && typeof catalog.billing === 'object' ? catalog.billing : {};
  const methods = resolveBillingPaymentMethods(src.paymentMethods);
  return {
    priceFloorPercent: Math.min(100, Math.max(1, toInt(src.priceFloorPercent, DEFAULT_BILLING.priceFloorPercent))),
    taxDefaultEnabled: Boolean(src.taxDefaultEnabled ?? DEFAULT_BILLING.taxDefaultEnabled),
    taxRate: Math.min(100, Math.max(0, toInt(src.taxRate, DEFAULT_BILLING.taxRate))),
    paymentMethods: methods,
  };
};

const calcDiscountAmount = (baseAmount, discountType, discountValue) => {
  const safeBase = toInt(baseAmount, 0);
  const type = normalizeDiscountType(discountType);
  const value = toInt(discountValue, 0);
  if (type === 'none' || safeBase <= 0 || value <= 0) return 0;
  if (type === 'fixed') return Math.min(safeBase, value);
  return Math.min(safeBase, Math.round((safeBase * value) / 100));
};

export const buildCatalogPricingMeta = ({
  catalogUnitPrice,
  count,
  floorPercent,
  overrideUnitPrice,
  overrideReason,
  discountType,
  discountValue,
}) => {
  const qty = Math.max(1, toInt(count, 1));
  const baseUnit = toInt(catalogUnitPrice, 0);
  const baseLine = baseUnit * qty;
  const floorUnitPrice = Math.round((baseUnit * Math.min(100, Math.max(1, toInt(floorPercent, DEFAULT_BILLING.priceFloorPercent)))) / 100);
  const overrideRaw = toInt(overrideUnitPrice, 0);
  const hasOverride = overrideRaw > 0;
  const effectiveUnit = hasOverride ? overrideRaw : baseUnit;
  const effectiveLine = effectiveUnit * qty;
  const isBelowFloor = hasOverride && overrideRaw < floorUnitPrice;
  const itemDiscountType = normalizeDiscountType(discountType);
  const itemDiscountValue = toInt(discountValue, 0);
  const itemDiscountAmount = calcDiscountAmount(effectiveLine, itemDiscountType, itemDiscountValue);
  const finalLineTotal = Math.max(0, effectiveLine - itemDiscountAmount);
  const finalUnitPrice = qty > 0 ? Math.round(finalLineTotal / qty) : finalLineTotal;

  return {
    catalogUnitPrice: baseUnit,
    catalogLineTotal: baseLine,
    overrideUnitPrice: hasOverride ? overrideRaw : null,
    overrideReason: hasOverride ? String(overrideReason || '').trim() : '',
    floorUnitPrice,
    isBelowFloor,
    itemDiscountType,
    itemDiscountValue,
    itemDiscountAmount,
    finalUnitPrice,
    finalLineTotal,
  };
};

export const buildManualPricingMeta = ({
  qty,
  unitPrice,
  discountType,
  discountValue,
}) => {
  const safeQty = Math.max(1, toInt(qty, 1));
  const safeUnit = toInt(unitPrice, 0);
  const baseLine = safeQty * safeUnit;
  const itemDiscountType = normalizeDiscountType(discountType);
  const itemDiscountValue = toInt(discountValue, 0);
  const itemDiscountAmount = calcDiscountAmount(baseLine, itemDiscountType, itemDiscountValue);
  const finalLineTotal = Math.max(0, baseLine - itemDiscountAmount);
  const finalUnitPrice = safeQty > 0 ? Math.round(finalLineTotal / safeQty) : finalLineTotal;

  return {
    catalogUnitPrice: safeUnit,
    catalogLineTotal: baseLine,
    overrideUnitPrice: null,
    overrideReason: '',
    floorUnitPrice: safeUnit,
    isBelowFloor: false,
    itemDiscountType,
    itemDiscountValue,
    itemDiscountAmount,
    finalUnitPrice,
    finalLineTotal,
  };
};

export const normalizePayment = (payment = {}) => ({
  id: String(payment.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
  date: String(payment.date || new Date().toLocaleDateString('fa-IR')),
  amount: toInt(payment.amount, 0),
  method: normalizePaymentMethod(payment.method || 'cash'),
  reference: String(payment.reference || ''),
  note: String(payment.note || ''),
  receipt: payment?.receipt && typeof payment.receipt === 'object'
    ? {
      filePath: String(payment.receipt.filePath || ''),
      originalName: String(payment.receipt.originalName || ''),
      mimeType: String(payment.receipt.mimeType || ''),
      size: toInt(payment.receipt.size, 0),
    }
    : null,
});

export const computeInvoiceFinancials = ({
  items = [],
  invoiceDiscountType = 'none',
  invoiceDiscountValue = 0,
  taxEnabled = false,
  taxRate = 10,
  payments = [],
}) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  const subTotal = normalizedItems.reduce((acc, item) => acc + toInt(item?.pricingMeta?.catalogLineTotal ?? item?.totalPrice ?? 0, 0), 0);
  const itemDiscountTotal = normalizedItems.reduce((acc, item) => acc + toInt(item?.pricingMeta?.itemDiscountAmount ?? 0, 0), 0);
  const afterItemDiscount = normalizedItems.reduce((acc, item) => acc + toInt(item?.pricingMeta?.finalLineTotal ?? item?.totalPrice ?? 0, 0), 0);

  const safeInvoiceDiscountType = normalizeDiscountType(invoiceDiscountType);
  const safeInvoiceDiscountValue = toInt(invoiceDiscountValue, 0);
  const invoiceDiscountAmount = calcDiscountAmount(afterItemDiscount, safeInvoiceDiscountType, safeInvoiceDiscountValue);
  const discountedTotal = Math.max(0, afterItemDiscount - invoiceDiscountAmount);

  const taxableBaseBeforeInvoiceDiscount = normalizedItems.reduce((acc, item) => {
    const isManual = (item?.itemType || 'catalog') === 'manual';
    const taxable = isManual ? Boolean(item?.manual?.taxable ?? true) : true;
    if (!taxable) return acc;
    return acc + toInt(item?.pricingMeta?.finalLineTotal ?? item?.totalPrice ?? 0, 0);
  }, 0);
  const ratio = afterItemDiscount > 0 ? discountedTotal / afterItemDiscount : 1;
  const taxableBase = Math.max(0, Math.round(taxableBaseBeforeInvoiceDiscount * ratio));

  const safeTaxEnabled = Boolean(taxEnabled);
  const safeTaxRate = Math.min(100, Math.max(0, toInt(taxRate, 10)));
  const taxAmount = safeTaxEnabled ? Math.round((taxableBase * safeTaxRate) / 100) : 0;
  const grandTotal = discountedTotal + taxAmount;

  const normalizedPayments = (Array.isArray(payments) ? payments : []).map(normalizePayment);
  const paidTotal = normalizedPayments.reduce((acc, payment) => acc + toInt(payment.amount, 0), 0);
  const dueAmount = Math.max(0, grandTotal - paidTotal);
  const paymentStatus = dueAmount <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'unpaid';

  return {
    subTotal,
    itemDiscountTotal,
    invoiceDiscountType: safeInvoiceDiscountType,
    invoiceDiscountValue: safeInvoiceDiscountValue,
    invoiceDiscountAmount,
    taxEnabled: safeTaxEnabled,
    taxRate: safeTaxRate,
    taxAmount,
    grandTotal,
    paidTotal,
    dueAmount,
    paymentStatus,
  };
};
