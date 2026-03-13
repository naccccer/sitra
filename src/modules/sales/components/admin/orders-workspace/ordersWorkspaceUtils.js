import { resolveApiFileUrl } from '@/utils/url';
import { computeInvoiceFinancials, ensureBillingSettings, PAYMENT_METHOD_OPTIONS } from '@/modules/sales/domain/invoice';

const PRINTABLE_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const PRINTABLE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);

export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_RECEIPT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
export const ALLOWED_RECEIPT_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

const getPatternExtension = (fileName = '') => {
  const name = String(fileName || '').trim().toLowerCase();
  if (!name.includes('.')) return '';
  return name.split('.').pop() || '';
};

const isDirectBrowserPrintable = (pattern = {}) => {
  const mimeType = String(pattern?.mimeType || '').toLowerCase();
  if (PRINTABLE_MIME_TYPES.has(mimeType)) return true;
  const ext = getPatternExtension(pattern?.fileName || '');
  return PRINTABLE_EXTENSIONS.has(ext);
};

const isCadPatternFile = (pattern = {}) => {
  const ext = getPatternExtension(pattern?.fileName || '');
  return CAD_EXTENSIONS.has(ext);
};

export const extractPatternFiles = (order = {}) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.flatMap((item, index) => {
    const pattern = item?.pattern;
    if (!pattern || pattern.type !== 'upload') return [];

    return [{
      id: `${order?.id || order?.orderCode || 'order'}-${item?.id || index}`,
      rowNumber: index + 1,
      itemTitle: item?.title || 'آیتم سفارش',
      fileName: String(pattern?.fileName || `pattern-${index + 1}`),
      filePath: resolveApiFileUrl(pattern?.filePath),
      mimeType: typeof pattern?.mimeType === 'string' ? pattern.mimeType : '',
      previewDataUrl: typeof pattern?.previewDataUrl === 'string' ? pattern.previewDataUrl : '',
      isDirectPrintable: isDirectBrowserPrintable(pattern),
      isCad: isCadPatternFile(pattern),
    }];
  });
};

export const toSafeAmount = (value) => Math.max(0, Number(value) || 0);

export const formatPersianDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('fa-IR');
};

export const defaultPaymentMethod = PAYMENT_METHOD_OPTIONS[0]?.value || 'cash';

export const PAYMENT_MANAGER_TABS = [
  { id: 'create', label: 'ثبت پرداخت' },
  { id: 'list', label: 'پرداخت‌های ثبت‌شده' },
  { id: 'discount', label: 'تخفیف' },
  { id: 'tax', label: 'مالیات' },
];

export const createPaymentDraft = () => ({
  date: new Date().toLocaleDateString('fa-IR'),
  amount: '',
  method: defaultPaymentMethod,
  note: '',
  receipt: null,
});

export const deriveFinancialSummary = (order = {}) => {
  const total = toSafeAmount(order?.financials?.grandTotal ?? order?.total);
  const paidFromPayments = (Array.isArray(order?.payments) ? order.payments : [])
    .reduce((acc, payment) => acc + toSafeAmount(payment?.amount), 0);
  const paid = Math.max(toSafeAmount(order?.financials?.paidTotal), paidFromPayments);
  const due = Math.max(0, toSafeAmount(order?.financials?.dueAmount ?? total - paid));
  const status = String(order?.financials?.paymentStatus || (due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'));
  return { total, paid, due, status };
};

export const paymentStatusPill = (status) => {
  if (status === 'paid') return { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'partial') return { label: 'تسویه ناقص', className: 'bg-amber-100 text-amber-700' };
  return { label: 'تسویه نشده', className: 'bg-rose-100 text-rose-700' };
};

export const ORDER_STAGE_OPTIONS = [
  { id: 'registered', label: 'ثبت شده', status: 'pending', className: 'bg-slate-100 text-slate-700' },
  { id: 'followup', label: 'نیاز به پیگیری', status: 'pending', className: 'bg-amber-100 text-amber-700' },
  { id: 'in_progress', label: 'در حال انجام', status: 'processing', className: 'bg-blue-100 text-blue-700' },
  { id: 'ready_delivery', label: 'آماده تحویل', status: 'processing', className: 'bg-indigo-100 text-indigo-700' },
  { id: 'delivered', label: 'تحویل شده', status: 'delivered', className: 'bg-emerald-100 text-emerald-700' },
];

export const ORDER_STAGE_MAP = ORDER_STAGE_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});

const FALLBACK_STAGE_BY_STATUS = {
  pending: 'registered',
  processing: 'in_progress',
  delivered: 'delivered',
  archived: 'delivered',
};

export const resolveOrderStageId = (order = {}) => {
  const rawStage = String(order?.financials?.orderStage || '').trim();
  if (ORDER_STAGE_MAP[rawStage]) return rawStage;
  const status = String(order?.status || '').trim();
  return FALLBACK_STAGE_BY_STATUS[status] || 'registered';
};

const normalizeDiscountType = (type) => (type === 'percent' || type === 'fixed' ? type : 'none');

export const createInvoiceAdjustmentsDraft = (order = {}, catalog = {}) => {
  const billing = ensureBillingSettings(catalog);
  const currentFinancials = order?.financials && typeof order.financials === 'object' ? order.financials : {};
  return {
    discountType: normalizeDiscountType(currentFinancials?.invoiceDiscountType),
    discountValue: String(toSafeAmount(currentFinancials?.invoiceDiscountValue ?? 0)),
    taxEnabled: Boolean(currentFinancials?.taxEnabled ?? billing.taxDefaultEnabled),
    taxRate: String(toSafeAmount(currentFinancials?.taxRate ?? billing.taxRate)),
    invoiceNotes: String(order?.invoiceNotes || ''),
  };
};

export const buildFinancialsForOrder = (order = {}, payments = [], invoiceDraft = null, catalog = {}) => {
  const draft = invoiceDraft || createInvoiceAdjustmentsDraft(order, catalog);
  return computeInvoiceFinancials({
    items: Array.isArray(order?.items) ? order.items : [],
    invoiceDiscountType: draft.discountType,
    invoiceDiscountValue: draft.discountValue,
    taxEnabled: draft.taxEnabled,
    taxRate: draft.taxRate,
    payments,
  });
};
