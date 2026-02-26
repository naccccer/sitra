import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Edit3, Archive, Printer, FileText, X, Upload, Link2, Trash2, Cog } from 'lucide-react';
import { toPN } from '../../../../utils/helpers';
import { StructureDetails } from '../../../../components/shared/StructureDetails';
import { PrintInvoice } from '../../../../components/shared/PrintInvoice';
import { PriceInput } from '../../../../components/shared/PriceInput';
import { PatternFilesModal } from './PatternFilesModal';
import { salesApi } from '../../services/salesApi';
import {
  computeInvoiceFinancials,
  ensureBillingSettings,
  getPaymentMethodLabel,
  normalizePayment,
  PAYMENT_METHOD_OPTIONS,
} from '../../domain/invoice';

const PRINTABLE_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const PRINTABLE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_RECEIPT_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

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

const extractPatternFiles = (order = {}) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.flatMap((item, index) => {
    const pattern = item?.pattern;
    if (!pattern || pattern.type !== 'upload') return [];

    return [{
      id: `${order?.id || order?.orderCode || 'order'}-${item?.id || index}`,
      rowNumber: index + 1,
      itemTitle: item?.title || 'آیتم سفارش',
      fileName: String(pattern?.fileName || `pattern-${index + 1}`),
      filePath: typeof pattern?.filePath === 'string' ? pattern.filePath : '',
      mimeType: typeof pattern?.mimeType === 'string' ? pattern.mimeType : '',
      previewDataUrl: typeof pattern?.previewDataUrl === 'string' ? pattern.previewDataUrl : '',
      isDirectPrintable: isDirectBrowserPrintable(pattern),
      isCad: isCadPatternFile(pattern),
    }];
  });
};

const toSafeAmount = (value) => Math.max(0, Number(value) || 0);
const defaultPaymentMethod = PAYMENT_METHOD_OPTIONS[0]?.value || 'cash';
const PAYMENT_MANAGER_TABS = [
  { id: 'create', label: 'ثبت پرداخت' },
  { id: 'list', label: 'پرداخت‌های ثبت‌شده' },
  { id: 'discount', label: 'تخفیف' },
  { id: 'tax', label: 'مالیات' },
];
const createPaymentDraft = () => ({
  date: new Date().toLocaleDateString('fa-IR'),
  amount: '',
  method: defaultPaymentMethod,
  note: '',
  receipt: null,
});

const deriveFinancialSummary = (order = {}) => {
  const total = toSafeAmount(order?.financials?.grandTotal ?? order?.total);
  const paidFromPayments = (Array.isArray(order?.payments) ? order.payments : []).reduce((acc, payment) => acc + toSafeAmount(payment?.amount), 0);
  const paid = Math.max(toSafeAmount(order?.financials?.paidTotal), paidFromPayments);
  const due = Math.max(0, toSafeAmount(order?.financials?.dueAmount ?? total - paid));
  const status = String(order?.financials?.paymentStatus || (due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'));
  return { total, paid, due, status };
};

const paymentStatusPill = (status) => {
  if (status === 'paid') return { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'partial') return { label: 'تسویه ناقص', className: 'bg-amber-100 text-amber-700' };
  return { label: 'تسویه نشده', className: 'bg-rose-100 text-rose-700' };
};

const ORDER_STAGE_OPTIONS = [
  { id: 'registered', label: 'ثبت شده', status: 'pending', className: 'bg-slate-100 text-slate-700' },
  { id: 'followup', label: 'نیاز به پیگیری', status: 'pending', className: 'bg-amber-100 text-amber-700' },
  { id: 'in_production', label: 'در حال تولید', status: 'processing', className: 'bg-blue-100 text-blue-700' },
  { id: 'ready_delivery', label: 'آماده تحویل', status: 'processing', className: 'bg-indigo-100 text-indigo-700' },
  { id: 'delivered', label: 'تحویل شده', status: 'delivered', className: 'bg-emerald-100 text-emerald-700' },
];

const ORDER_STAGE_MAP = ORDER_STAGE_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});

const FALLBACK_STAGE_BY_STATUS = {
  pending: 'registered',
  processing: 'in_production',
  delivered: 'delivered',
  archived: 'delivered',
};

const resolveOrderStageId = (order = {}) => {
  const rawStage = String(order?.financials?.orderStage || '').trim();
  if (ORDER_STAGE_MAP[rawStage]) return rawStage;
  const status = String(order?.status || '').trim();
  return FALLBACK_STAGE_BY_STATUS[status] || 'registered';
};

const normalizeDiscountType = (type) => (type === 'percent' || type === 'fixed' ? type : 'none');

const createInvoiceAdjustmentsDraft = (order = {}, catalog = {}) => {
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

const buildFinancialsForOrder = (order = {}, payments = [], invoiceDraft = null, catalog = {}) => {
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

export const AdminOrdersView = ({ orders, setOrders, catalog, profile, onEditOrder }) => {
  const [activeOrdersTab, setActiveOrdersTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [patternFilesContext, setPatternFilesContext] = useState(null);
  const [paymentDraftsByOrder, setPaymentDraftsByOrder] = useState({});
  const [paymentTouchedByOrder, setPaymentTouchedByOrder] = useState({});
  const [paymentEditDrafts, setPaymentEditDrafts] = useState({});
  const [invoiceDraftsByOrder, setInvoiceDraftsByOrder] = useState({});
  const [paymentManagerOrderId, setPaymentManagerOrderId] = useState(null);
  const [paymentManagerActiveTab, setPaymentManagerActiveTab] = useState(PAYMENT_MANAGER_TABS[0].id);
  const [uploadingReceiptKey, setUploadingReceiptKey] = useState('');

  const updateOrderStatus = async (id, status) => {
    const previousOrder = orders.find((o) => o.id === id);
    if (!previousOrder) return;

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    try {
      const response = await salesApi.updateOrderStatus(id, status);
      if (response?.order) {
        setOrders((prev) => prev.map((o) => (o.id === id ? response.order : o)));
      }
    } catch (error) {
      console.error('Failed to update order status.', error);
      setOrders((prev) => prev.map((o) => (o.id === id ? previousOrder : o)));
      alert(error?.message || 'به‌روزرسانی وضعیت سفارش ناموفق بود.');
    }
  };

  const buildOrderUpdatePayload = (order, nextStatus, nextFinancials) => ({
    id: Number(order.id),
    customerName: order.customerName,
    phone: order.phone,
    date: order.date,
    total: toSafeAmount(nextFinancials?.grandTotal ?? order.total),
    status: nextStatus,
    items: Array.isArray(order.items) ? order.items : [],
    financials: nextFinancials,
    payments: (Array.isArray(order.payments) ? order.payments : []).map(normalizePayment),
    invoiceNotes: String(order.invoiceNotes || ''),
  });

  const updateOrderWorkflowStage = async (order, stageId) => {
    const selectedStage = ORDER_STAGE_MAP[stageId] || ORDER_STAGE_MAP.registered;
    const previousOrder = orders.find((candidate) => candidate.id === order?.id);
    if (!previousOrder) return;

    const nextFinancials = {
      ...(previousOrder.financials && typeof previousOrder.financials === 'object' ? previousOrder.financials : {}),
      orderStage: selectedStage.id,
    };
    const optimisticOrder = { ...previousOrder, status: selectedStage.status, financials: nextFinancials };
    const payload = buildOrderUpdatePayload(previousOrder, selectedStage.status, nextFinancials);

    setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? optimisticOrder : candidate)));

    try {
      const response = await salesApi.updateOrder(payload);
      if (response?.order) {
        setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? response.order : candidate)));
      }
    } catch (error) {
      console.error('Failed to update order workflow stage.', error);
      setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? previousOrder : candidate)));
      alert(error?.message || 'به‌روزرسانی وضعیت سفارش ناموفق بود.');
    }
  };

  const handleArchiveOrder = (order) => {
    if (!order?.id) return;
    updateOrderStatus(order.id, 'archived');
    if (expandedOrderId === order.id) setExpandedOrderId(null);
  };

  const deleteArchivedOrder = async (order) => {
    if (!order || order.status !== 'archived') return;

    const confirmed = window.confirm(`سفارش ${order.orderCode || ''} برای همیشه حذف شود؟ این عمل قابل بازگشت نیست.`);
    if (!confirmed) return;

    const orderId = order.id;
    const previousOrders = orders;

    setOrders((prev) => prev.filter((candidate) => candidate.id !== orderId));
    if (expandedOrderId === orderId) setExpandedOrderId(null);
    if (paymentManagerOrderId === orderId) setPaymentManagerOrderId(null);

    try {
      await salesApi.deleteOrder(orderId);
    } catch (error) {
      console.error('Failed to delete archived order.', error);
      setOrders(previousOrders);
      alert(error?.message || 'حذف سفارش ناموفق بود.');
    }
  };

  const toggleOrderExpansion = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const openPatternFilesModal = (order) => {
    const files = extractPatternFiles(order);
    if (files.length === 0) {
      alert('برای این سفارش فایل الگوی آپلودی ثبت نشده است.');
      return;
    }
    setPatternFilesContext({
      orderCode: order?.orderCode || '',
      files,
    });
  };

  const printFactoryOrder = (order) => {
    if (!order) return;
    const nextOrder = {
      ...order,
      factoryIncludeNonProductionManual: true,
    };
    setViewingOrder(nextOrder);
    setTimeout(() => window.print(), 100);
  };

  const getOrderPaymentDraft = (orderId) => paymentDraftsByOrder[orderId] || createPaymentDraft();
  const getOrderPaymentTouched = (orderId) => Boolean(paymentTouchedByOrder[orderId]);
  const getOrderInvoiceDraft = (order) => {
    if (!order?.id) return createInvoiceAdjustmentsDraft({}, catalog);
    return invoiceDraftsByOrder[order.id] || createInvoiceAdjustmentsDraft(order, catalog);
  };

  const updateOrderInvoiceDraft = (orderId, field, value) => {
    const currentOrder = orders.find((candidate) => candidate.id === orderId);
    setInvoiceDraftsByOrder((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || createInvoiceAdjustmentsDraft(currentOrder, catalog)), [field]: value },
    }));
  };

  const openPaymentManager = (order) => {
    if (!order?.id) return;
    setPaymentManagerOrderId(order.id);
    setPaymentManagerActiveTab(PAYMENT_MANAGER_TABS[0].id);
    setInvoiceDraftsByOrder((prev) => (
      prev[order.id]
        ? prev
        : { ...prev, [order.id]: createInvoiceAdjustmentsDraft(order, catalog) }
    ));
  };

  const closePaymentManager = () => {
    setPaymentManagerOrderId(null);
    setPaymentManagerActiveTab(PAYMENT_MANAGER_TABS[0].id);
  };

  const updateOrderPaymentDraft = (orderId, field, value) => {
    setPaymentDraftsByOrder((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || createPaymentDraft()), [field]: value },
    }));
  };

  const markOrderPaymentTouched = (orderId, touched = true) => {
    setPaymentTouchedByOrder((prev) => ({ ...prev, [orderId]: touched }));
  };

  const upsertOrderPayments = async (order, nextPaymentsInput, invoiceDraftInput = null) => {
    const previousOrder = orders.find((candidate) => candidate.id === order.id);
    if (!previousOrder) return;

    const nextPayments = (Array.isArray(nextPaymentsInput) ? nextPaymentsInput : []).map(normalizePayment);
    const invoiceDraft = invoiceDraftInput || getOrderInvoiceDraft(previousOrder);
    const computedFinancials = buildFinancialsForOrder(previousOrder, nextPayments, invoiceDraft, catalog);
    const nextFinancials = {
      ...computedFinancials,
      orderStage: String(previousOrder?.financials?.orderStage || resolveOrderStageId(previousOrder)),
    };
    const nextInvoiceNotes = String(invoiceDraft?.invoiceNotes || '');
    const optimisticOrder = {
      ...previousOrder,
      payments: nextPayments,
      financials: nextFinancials,
      invoiceNotes: nextInvoiceNotes,
      total: nextFinancials.grandTotal,
    };

    setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? optimisticOrder : candidate)));

    try {
      const payload = {
        id: Number(previousOrder.id),
        customerName: previousOrder.customerName,
        phone: previousOrder.phone,
        date: previousOrder.date,
        total: nextFinancials.grandTotal,
        status: previousOrder.status,
        items: Array.isArray(previousOrder.items) ? previousOrder.items : [],
        financials: nextFinancials,
        payments: nextPayments,
        invoiceNotes: nextInvoiceNotes,
      };
      const response = await salesApi.updateOrder(payload);
      if (response?.order) {
        setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? response.order : candidate)));
        setInvoiceDraftsByOrder((prev) => ({ ...prev, [previousOrder.id]: createInvoiceAdjustmentsDraft(response.order, catalog) }));
      }
    } catch (error) {
      console.error('Failed to update order payments.', error);
      setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? previousOrder : candidate)));
      setInvoiceDraftsByOrder((prev) => ({ ...prev, [previousOrder.id]: createInvoiceAdjustmentsDraft(previousOrder, catalog) }));
      alert(error?.message || 'به‌روزرسانی پرداخت‌ها ناموفق بود.');
    }
  };

  const saveInvoiceAdjustmentsForOrder = async (order) => {
    const existing = (Array.isArray(order?.payments) ? order.payments : []).map(normalizePayment);
    await upsertOrderPayments(order, existing, getOrderInvoiceDraft(order));
  };

  const addPaymentForOrder = async (order) => {
    const orderId = order.id;
    const draft = getOrderPaymentDraft(orderId);
    markOrderPaymentTouched(orderId, true);

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const nextPayment = normalizePayment({
      ...draft,
      amount: Math.round(amount),
    });
    const existing = (Array.isArray(order.payments) ? order.payments : []).map(normalizePayment);
    await upsertOrderPayments(order, [...existing, nextPayment]);

    setPaymentDraftsByOrder((prev) => ({ ...prev, [orderId]: createPaymentDraft() }));
    markOrderPaymentTouched(orderId, false);
  };

  const beginEditPayment = (orderId, payment) => {
    setPaymentEditDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [payment.id]: { ...normalizePayment(payment) },
      },
    }));
  };

  const updateEditPaymentField = (orderId, paymentId, field, value) => {
    setPaymentEditDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [paymentId]: { ...((prev[orderId] || {})[paymentId] || {}), [field]: value },
      },
    }));
  };

  const cancelEditPayment = (orderId, paymentId) => {
    setPaymentEditDrafts((prev) => {
      const next = { ...prev };
      const scoped = { ...(next[orderId] || {}) };
      delete scoped[paymentId];
      if (Object.keys(scoped).length === 0) delete next[orderId];
      else next[orderId] = scoped;
      return next;
    });
  };

  const saveEditedPayment = async (order, paymentId) => {
    const orderId = order.id;
    const draft = paymentEditDrafts?.[orderId]?.[paymentId];
    const amount = Number(draft?.amount);
    if (!draft || !Number.isFinite(amount) || amount <= 0) return;

    const existing = (Array.isArray(order.payments) ? order.payments : []).map(normalizePayment);
    const nextPayments = existing.map((payment) => (payment.id === paymentId ? normalizePayment({ ...draft, amount: Math.round(amount) }) : payment));
    await upsertOrderPayments(order, nextPayments);
    cancelEditPayment(orderId, paymentId);
  };

  const removePayment = async (order, paymentId) => {
    const existing = (Array.isArray(order.payments) ? order.payments : []).map(normalizePayment);
    const nextPayments = existing.filter((payment) => payment.id !== paymentId);
    await upsertOrderPayments(order, nextPayments);
  };

  const validateReceiptFile = (file) => {
    if (!file) return 'فایلی انتخاب نشده است.';
    if (file.size > MAX_RECEIPT_SIZE) return 'حجم رسید نباید بیشتر از ۵ مگابایت باشد.';
    const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_RECEIPT_TYPES.has(file.type) && !ALLOWED_RECEIPT_EXTENSIONS.has(extension)) {
      return 'فرمت رسید فقط PDF یا تصویر (JPG/PNG) مجاز است.';
    }
    return '';
  };

  const uploadReceipt = async (file) => {
    const validationError = validateReceiptFile(file);
    if (validationError) {
      alert(validationError);
      return null;
    }

    const response = await salesApi.uploadReceiptFile(file);
    return {
      filePath: String(response?.filePath || ''),
      originalName: String(response?.originalName || file.name || ''),
      mimeType: String(response?.mimeType || file.type || ''),
      size: Number(response?.size || file.size || 0),
    };
  };

  const uploadDraftReceipt = async (orderId, file) => {
    const key = `draft:${orderId}`;
    setUploadingReceiptKey(key);
    try {
      const receipt = await uploadReceipt(file);
      if (!receipt) return;
      updateOrderPaymentDraft(orderId, 'receipt', receipt);
    } catch (error) {
      console.error('Failed to upload receipt.', error);
      alert(error?.message || 'آپلود رسید ناموفق بود.');
    } finally {
      setUploadingReceiptKey('');
    }
  };

  const uploadEditedReceipt = async (orderId, paymentId, file) => {
    const key = `edit:${orderId}:${paymentId}`;
    setUploadingReceiptKey(key);
    try {
      const receipt = await uploadReceipt(file);
      if (!receipt) return;
      updateEditPaymentField(orderId, paymentId, 'receipt', receipt);
    } catch (error) {
      console.error('Failed to upload receipt.', error);
      alert(error?.message || 'آپلود رسید ناموفق بود.');
    } finally {
      setUploadingReceiptKey('');
    }
  };

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const matchesTab = activeOrdersTab === 'all' ? o.status !== 'archived' : o.status === activeOrdersTab;
    const code = String(o.orderCode || '');
    const name = String(o.customerName || '');
    const phone = String(o.phone || '');
    const q = String(searchQuery || '');
    const matchesSearch = name.includes(q) || phone.includes(q) || code.includes(q);
    return matchesTab && matchesSearch;
  }), [orders, activeOrdersTab, searchQuery]);

  const paymentManagerOrder = paymentManagerOrderId
    ? orders.find((candidate) => candidate.id === paymentManagerOrderId) || null
    : null;
  const paymentManagerPayments = paymentManagerOrder
    ? (Array.isArray(paymentManagerOrder.payments) ? paymentManagerOrder.payments : []).map(normalizePayment)
    : [];
  const paymentManagerPaymentDraft = paymentManagerOrder
    ? getOrderPaymentDraft(paymentManagerOrder.id)
    : createPaymentDraft();
  const paymentManagerPaymentTouched = paymentManagerOrder ? getOrderPaymentTouched(paymentManagerOrder.id) : false;
  const paymentManagerPaymentAmountValid = Number(paymentManagerPaymentDraft.amount) > 0;
  const paymentManagerInvoiceDraft = paymentManagerOrder ? getOrderInvoiceDraft(paymentManagerOrder) : null;
  const paymentManagerFinancials = paymentManagerOrder && paymentManagerInvoiceDraft
    ? buildFinancialsForOrder(paymentManagerOrder, paymentManagerPayments, paymentManagerInvoiceDraft, catalog)
    : null;
  const paymentManagerStatusPill = paymentManagerFinancials
    ? paymentStatusPill(paymentManagerFinancials.paymentStatus)
    : { label: '-', className: 'bg-slate-100 text-slate-500' };
  const paymentManagerSubmitLabel = (paymentManagerActiveTab === 'discount' || paymentManagerActiveTab === 'tax')
    ? 'ثبت تنظیمات مالی'
    : paymentManagerActiveTab === 'create'
      ? 'ثبت پرداخت'
      : 'ثبت';
  const paymentManagerSubmitDisabled = paymentManagerActiveTab === 'create' && !paymentManagerPaymentAmountValid;

  const handlePaymentManagerSubmit = async () => {
    if (!paymentManagerOrder) return;
    if (paymentManagerActiveTab === 'discount' || paymentManagerActiveTab === 'tax') {
      await saveInvoiceAdjustmentsForOrder(paymentManagerOrder);
      return;
    }
    if (paymentManagerActiveTab === 'create') {
      await addPaymentForOrder(paymentManagerOrder);
      return;
    }
    closePaymentManager();
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-left-4">
      <div className="print-hide flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar gap-1">
          {[
            { id: 'all', label: 'همه سفارش‌ها' },
            { id: 'pending', label: 'ثبت شده / پیگیری' },
            { id: 'processing', label: 'تولید / آماده تحویل' },
            { id: 'delivered', label: 'تحویل شده' },
            { id: 'archived', label: 'آرشیو' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveOrdersTab(t.id)}
              className={`whitespace-nowrap px-3 py-2 text-[11px] sm:text-xs font-bold rounded-md transition-all ${activeOrdersTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو کد، نام یا موبایل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-4 py-2 text-xs font-bold outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="print-hide bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-black text-center border-l border-slate-100 w-10">ردیف</th>
                <th className="p-3 font-black text-center border-l border-slate-100">کد رهگیری</th>
                <th className="p-3 font-black border-l border-slate-100">نام مشتری</th>
                <th className="p-3 font-black border-l border-slate-100">موبایل</th>
                <th className="p-3 font-black text-center border-l border-slate-100">تاریخ ثبت</th>
                <th className="p-3 font-black text-center border-l border-slate-100">مبلغ کل</th>
                <th className="p-3 font-black text-center border-l border-slate-100">مانده</th>
                <th className="p-3 font-black text-center border-l border-slate-100">وضعیت مالی</th>
                <th className="p-3 font-black text-center border-l border-slate-100">وضعیت سفارش</th>
                <th className="p-3 font-black text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400 font-bold">هیچ سفارشی یافت نشد.</td>
                </tr>
              ) : (
                filteredOrders.map((o, index) => {
                  const financialSummary = deriveFinancialSummary(o);
                  const paymentPill = paymentStatusPill(financialSummary.status);
                  const orderStageId = resolveOrderStageId(o);
                  const orderStage = ORDER_STAGE_MAP[orderStageId] || ORDER_STAGE_MAP.registered;

                  return (
                    <React.Fragment key={o.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${o.status === 'archived' ? 'opacity-50 grayscale' : ''} ${expandedOrderId === o.id ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-3 text-center font-bold text-slate-400 border-l border-slate-50 tabular-nums">{toPN(index + 1)}</td>
                        <td className="p-3 text-center font-black text-blue-700 tabular-nums border-l border-slate-50 tracking-wider" dir="ltr">{toPN(o.orderCode)}</td>
                        <td className="p-3 font-black text-slate-800 border-l border-slate-50">
                          {o.customerName}
                          <span className="text-[10px] text-slate-400 font-normal mr-1">({toPN(Array.isArray(o.items) ? o.items.length : o.items)} قلم)</span>
                        </td>
                        <td className="p-3 font-bold text-slate-600 tabular-nums border-l border-slate-50" dir="ltr">{toPN(o.phone)}</td>
                        <td className="p-3 text-center font-bold text-slate-500 border-l border-slate-50">{toPN(o.date)}</td>
                        <td className="p-3 text-center font-black text-slate-900 tabular-nums border-l border-slate-50">{toPN(financialSummary.total.toLocaleString())}</td>
                        <td className="p-3 text-center font-black text-rose-600 tabular-nums border-l border-slate-50">{toPN(financialSummary.due.toLocaleString())}</td>
                        <td className="p-3 text-center border-l border-slate-50">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`text-[10px] font-black px-2 py-1 rounded ${paymentPill.className}`}>
                              {paymentPill.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center border-l border-slate-50">
                          <div className="flex items-center justify-center gap-1.5">
                            {o.status === 'archived' ? (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">آرشیو شده</span>
                            ) : (
                              <select
                                value={orderStageId}
                                onChange={(e) => updateOrderWorkflowStage(o, e.target.value)}
                                className={`h-8 min-w-[130px] text-[10px] font-black px-2 py-1.5 rounded-md outline-none cursor-pointer appearance-none text-center ${orderStage.className}`}
                              >
                                {ORDER_STAGE_OPTIONS.map((stageOption) => (
                                  <option key={stageOption.id} value={stageOption.id}>{stageOption.label}</option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={() => openPaymentManager(o)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              title="مدیریت پرداخت"
                              type="button"
                            >
                              <Cog size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => toggleOrderExpansion(o.id)} className={`p-1.5 rounded transition-colors ${expandedOrderId === o.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50'}`} title="مشاهده آیتم‌ها">
                              {expandedOrderId === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {o.status !== 'archived' && (
                              <>
                                <button onClick={() => onEditOrder(o)} className="text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 p-1.5 rounded transition-colors" title="ویرایش سفارش"><Edit3 size={14} /></button>
                                <button onClick={() => handleArchiveOrder(o)} className="text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-1.5 rounded transition-colors" title="بایگانی"><Archive size={14} /></button>
                              </>
                            )}
                            {o.status === 'archived' && (
                              <>
                                <button onClick={() => updateOrderWorkflowStage(o, 'registered')} className="text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1.5 rounded text-[10px] font-bold transition-colors">بازیابی</button>
                                <button onClick={() => deleteArchivedOrder(o)} className="text-slate-500 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 p-1.5 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1" title="حذف دائمی">
                                  <Trash2 size={12} />
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedOrderId === o.id && (
                        <tr className="bg-slate-50/80 animate-in fade-in">
                          <td colSpan="10" className="p-0 border-b-2 border-slate-200">
                            <div className="p-4 m-3 bg-white rounded-xl shadow-inner border border-slate-200">
                              <div className="flex flex-wrap gap-2 justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                <span className="font-black text-sm text-slate-800">ریز اقلام سفارش</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => openPatternFilesModal(o)}
                                    className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg flex gap-1 items-center font-bold shadow-sm transition-colors"
                                  >
                                    <FileText size={12} />
                                    فایل‌های الگو
                                  </button>
                                  <button onClick={() => printFactoryOrder(o)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex gap-1 items-center font-bold shadow-sm transition-colors">
                                    <Printer size={12} />
                                    چاپ برای تولید
                                  </button>
                                </div>
                              </div>

                              <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs font-black text-slate-700">کل فاکتور: {toPN(financialSummary.total.toLocaleString())}</div>
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs font-black text-slate-700">پرداخت‌شده: {toPN(financialSummary.paid.toLocaleString())}</div>
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs font-black text-rose-700">مانده: {toPN(financialSummary.due.toLocaleString())}</div>
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs font-black text-slate-700">وضعیت مالی: {paymentPill.label}</div>
                              </div>

                              <table className="w-full text-right text-sm border-collapse mt-2">
                                <thead className="bg-slate-50 text-slate-500 text-xs border-y border-slate-200 rounded-lg">
                                  <tr>
                                    <th className="p-2 font-bold w-12 text-center border-l border-slate-200/50">ردیف</th>
                                    <th className="p-2 font-bold w-36 border-l border-slate-200/50">نوع ساختار</th>
                                    <th className="p-2 font-bold border-l border-slate-200/50">پیکربندی و خدمات</th>
                                    <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">ابعاد (cm)</th>
                                    <th className="p-2 font-bold w-16 text-center border-l border-slate-200/50">تعداد</th>
                                    <th className="p-2 font-bold w-28 text-center border-l border-slate-200/50">فی نهایی (تومان)</th>
                                    <th className="p-2 font-bold w-32 text-left pl-4">مبلغ کل (تومان)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {Array.isArray(o.items) && o.items.map((item, ii) => {
                                    const isManual = (item?.itemType || 'catalog') === 'manual';
                                    const widthText = isManual ? '-' : `${toPN(item?.dimensions?.width)} × ${toPN(item?.dimensions?.height)}`;
                                    const countText = isManual ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1);
                                    const unitPrice = toSafeAmount(item?.unitPrice);
                                    const totalPrice = toSafeAmount(item?.totalPrice);

                                    return (
                                      <tr key={item.id || `${ii}`} className="hover:bg-blue-50/20 transition-colors even:bg-slate-50/50">
                                        <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 tabular-nums">{toPN(ii + 1)}</td>
                                        <td className="p-2 border-l border-slate-100">
                                          <span className={`px-3 py-1 rounded-full text-[9px] font-black whitespace-nowrap shadow-sm border ${(item?.itemType || 'catalog') === 'manual' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-700'}`}>{item.title}</span>
                                        </td>
                                        <td className="p-2 border-l border-slate-100"><StructureDetails item={item} catalog={catalog} /></td>
                                        <td className="p-2 text-center font-bold text-slate-600 border-l border-slate-100 tabular-nums" dir="ltr">{widthText}</td>
                                        <td className="p-2 text-center font-black text-slate-800 tabular-nums">{toPN(countText)}</td>
                                        <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-100 tabular-nums">{toPN(unitPrice.toLocaleString())}</td>
                                        <td className="p-2 text-left pl-4 font-black text-slate-900 bg-blue-50/30 text-[13px] tabular-nums">{toPN(totalPrice.toLocaleString())}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentManagerOrder && paymentManagerInvoiceDraft && paymentManagerFinancials && (
        <div className="fixed inset-0 bg-slate-900/60 z-[90] flex items-center justify-center p-4 print-hide">
          <div className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex max-h-[90vh] flex-col">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="text-sm font-black">مدیریت پرداخت - سفارش {toPN(paymentManagerOrder.orderCode)}</div>
              <button onClick={closePaymentManager} className="p-1 rounded hover:bg-white/10"><X size={16} /></button>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-white border border-slate-200 p-2 text-xs font-black text-slate-700">کل فاکتور: {toPN(paymentManagerFinancials.grandTotal.toLocaleString())}</div>
                <div className="rounded-lg bg-white border border-slate-200 p-2 text-xs font-black text-slate-700">پرداخت‌شده: {toPN(paymentManagerFinancials.paidTotal.toLocaleString())}</div>
                <div className="rounded-lg bg-white border border-slate-200 p-2 text-xs font-black text-rose-700">مانده: {toPN(paymentManagerFinancials.dueAmount.toLocaleString())}</div>
                <div className="rounded-lg bg-white border border-slate-200 p-2 text-xs font-black text-slate-700">وضعیت مالی: <span className={`mr-2 px-1.5 py-0.5 rounded ${paymentManagerStatusPill.className}`}>{paymentManagerStatusPill.label}</span></div>
              </div>
            </div>

            <div className="px-4 pt-3 border-b border-slate-200 bg-white">
              <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar gap-1">
                {PAYMENT_MANAGER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPaymentManagerActiveTab(tab.id)}
                    className={`whitespace-nowrap h-9 px-3 rounded-md text-xs font-black transition-colors ${paymentManagerActiveTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                {(paymentManagerActiveTab === 'discount' || paymentManagerActiveTab === 'tax') && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800">تنظیمات مالی فاکتور</h4>
                    </div>

                    {paymentManagerActiveTab === 'discount' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600">نوع تخفیف فاکتور</label>
                          <select
                            value={paymentManagerInvoiceDraft.discountType}
                            onChange={(e) => updateOrderInvoiceDraft(paymentManagerOrder.id, 'discountType', e.target.value)}
                            className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                          >
                            <option value="none">بدون تخفیف کل</option>
                            <option value="percent">تخفیف درصدی</option>
                            <option value="fixed">تخفیف ثابت</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600">مقدار تخفیف کل</label>
                          <div className={`h-9 w-full border rounded-lg ${paymentManagerInvoiceDraft.discountType === 'none' ? 'bg-slate-100 border-slate-100' : 'bg-white border-slate-200'}`}>
                            <PriceInput
                              value={paymentManagerInvoiceDraft.discountValue}
                              onChange={(value) => updateOrderInvoiceDraft(paymentManagerOrder.id, 'discountValue', value)}
                              disabled={paymentManagerInvoiceDraft.discountType === 'none'}
                              placeholder="0"
                              className={paymentManagerInvoiceDraft.discountType === 'none' ? 'text-slate-400' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentManagerActiveTab === 'tax' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600">مالیات</label>
                          <label className="h-9 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(paymentManagerInvoiceDraft.taxEnabled)}
                              onChange={(e) => updateOrderInvoiceDraft(paymentManagerOrder.id, 'taxEnabled', e.target.checked)}
                            />
                            اعمال مالیات
                          </label>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600">نرخ مالیات (%)</label>
                          <input
                            type="number"
                            value={paymentManagerInvoiceDraft.taxRate}
                            onChange={(e) => updateOrderInvoiceDraft(paymentManagerOrder.id, 'taxRate', e.target.value)}
                            disabled={!paymentManagerInvoiceDraft.taxEnabled}
                            className={`h-9 w-full border rounded-lg px-2 text-xs font-bold ${!paymentManagerInvoiceDraft.taxEnabled ? 'bg-slate-100 border-slate-100 text-slate-400' : 'bg-white border-slate-200'}`}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-black text-slate-600">یادداشت فاکتور</label>
                      <textarea
                        value={paymentManagerInvoiceDraft.invoiceNotes}
                        onChange={(e) => updateOrderInvoiceDraft(paymentManagerOrder.id, 'invoiceNotes', e.target.value)}
                        className="mt-1 w-full min-h-20 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                        placeholder="یادداشت داخلی یا توضیح برای مشتری"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">جمع قبل از تخفیف: {toPN(paymentManagerFinancials.subTotal.toLocaleString())}</div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">تخفیف سطری: {toPN(paymentManagerFinancials.itemDiscountTotal.toLocaleString())}</div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">تخفیف کل: {toPN(paymentManagerFinancials.invoiceDiscountAmount.toLocaleString())}</div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">مالیات: {toPN(paymentManagerFinancials.taxAmount.toLocaleString())}</div>
                    </div>
                  </div>
                )}

                {(paymentManagerActiveTab === 'create' || paymentManagerActiveTab === 'list') && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                  <h4 className="text-xs font-black text-slate-800">
                    {paymentManagerActiveTab === 'create' ? 'ثبت پرداخت جدید' : 'پرداخت‌های ثبت‌شده'}
                  </h4>

                  {paymentManagerActiveTab === 'create' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600">تاریخ</label>
                      <input
                        type="text"
                        value={paymentManagerPaymentDraft.date}
                        onChange={(e) => updateOrderPaymentDraft(paymentManagerOrder.id, 'date', e.target.value)}
                        className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600">مبلغ (تومان)</label>
                      <div className="h-9 w-full bg-white border border-slate-200 rounded-lg">
                        <PriceInput
                          value={paymentManagerPaymentDraft.amount}
                          onChange={(value) => {
                            updateOrderPaymentDraft(paymentManagerOrder.id, 'amount', value);
                            markOrderPaymentTouched(paymentManagerOrder.id, true);
                          }}
                          placeholder="0"
                        />
                      </div>
                      {paymentManagerPaymentTouched && !paymentManagerPaymentAmountValid && (
                        <div className="text-[10px] font-bold text-rose-600">مبلغ باید بیشتر از صفر باشد.</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600">روش پرداخت</label>
                      <select
                        value={paymentManagerPaymentDraft.method}
                        onChange={(e) => updateOrderPaymentDraft(paymentManagerOrder.id, 'method', e.target.value)}
                        className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                      >
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600">یادداشت</label>
                      <input
                        type="text"
                        value={paymentManagerPaymentDraft.note}
                        onChange={(e) => updateOrderPaymentDraft(paymentManagerOrder.id, 'note', e.target.value)}
                        className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600">رسید واریزی (اختیاری)</label>
                      <div className="flex gap-1.5">
                        <label htmlFor={`payment-receipt-${paymentManagerOrder.id}`} className="h-9 px-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-200">
                          <Upload size={12} />
                          {uploadingReceiptKey === `draft:${paymentManagerOrder.id}` ? 'در حال آپلود...' : 'آپلود رسید'}
                        </label>
                        <input
                          id={`payment-receipt-${paymentManagerOrder.id}`}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            uploadDraftReceipt(paymentManagerOrder.id, file);
                            e.target.value = '';
                          }}
                        />
                        {paymentManagerPaymentDraft.receipt?.filePath && (
                          <button
                            onClick={() => updateOrderPaymentDraft(paymentManagerOrder.id, 'receipt', null)}
                            className="h-9 px-2 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                      {paymentManagerPaymentDraft.receipt?.originalName && (
                        <div className="text-[10px] font-bold text-slate-500 truncate">{paymentManagerPaymentDraft.receipt.originalName}</div>
                      )}
                    </div>
                      </div>

                      <div>
                        <button
                          onClick={() => addPaymentForOrder(paymentManagerOrder)}
                          disabled={!paymentManagerPaymentAmountValid}
                          className={`h-9 px-3 rounded-lg text-xs font-black ${paymentManagerPaymentAmountValid ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          افزودن پرداخت
                        </button>
                      </div>
                    </>
                  )}

                  {paymentManagerActiveTab === 'list' && (paymentManagerPayments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs font-bold text-slate-500">هنوز پرداختی ثبت نشده است.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[860px]">
                        <thead className="bg-white text-slate-500 border-y border-slate-200">
                          <tr>
                            <th className="p-2 text-right font-black">تاریخ</th>
                            <th className="p-2 text-right font-black">روش</th>
                            <th className="p-2 text-right font-black">یادداشت</th>
                            <th className="p-2 text-right font-black">رسید</th>
                            <th className="p-2 text-left font-black">مبلغ</th>
                            <th className="p-2 text-center font-black">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentManagerPayments.map((payment) => {
                            const rowDraft = paymentEditDrafts?.[paymentManagerOrder.id]?.[payment.id];
                            const isEditing = Boolean(rowDraft);
                            const rowAmountValid = Number(rowDraft?.amount) > 0;

                            return (
                              <tr key={payment.id}>
                                <td className="p-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={rowDraft.date || ''}
                                      onChange={(e) => updateEditPaymentField(paymentManagerOrder.id, payment.id, 'date', e.target.value)}
                                      className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-700">{toPN(payment.date)}</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isEditing ? (
                                    <select
                                      value={rowDraft.method || defaultPaymentMethod}
                                      onChange={(e) => updateEditPaymentField(paymentManagerOrder.id, payment.id, 'method', e.target.value)}
                                      className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                    >
                                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="font-bold text-slate-700">{getPaymentMethodLabel(payment.method)}</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={rowDraft.note || ''}
                                      onChange={(e) => updateEditPaymentField(paymentManagerOrder.id, payment.id, 'note', e.target.value)}
                                      className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-500">{payment.note || '-'}</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <label htmlFor={`edit-receipt-${paymentManagerOrder.id}-${payment.id}`} className="h-8 px-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1">
                                        <Upload size={11} />
                                        {uploadingReceiptKey === `edit:${paymentManagerOrder.id}:${payment.id}` ? 'در حال آپلود...' : 'آپلود'}
                                      </label>
                                      <input
                                        id={`edit-receipt-${paymentManagerOrder.id}-${payment.id}`}
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          uploadEditedReceipt(paymentManagerOrder.id, payment.id, file);
                                          e.target.value = '';
                                        }}
                                      />
                                      {rowDraft.receipt?.filePath && (
                                        <button
                                          onClick={() => updateEditPaymentField(paymentManagerOrder.id, payment.id, 'receipt', null)}
                                          className="h-8 px-2 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200"
                                        >
                                          حذف
                                        </button>
                                      )}
                                    </div>
                                  ) : payment.receipt?.filePath ? (
                                    <a href={payment.receipt.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-black">
                                      <Link2 size={12} />
                                      {payment.receipt.originalName || 'مشاهده'}
                                    </a>
                                  ) : (
                                    <span className="font-bold text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="p-2 text-left font-black tabular-nums text-slate-900">
                                  {isEditing ? (
                                    <div className="h-8 w-24 bg-white border border-slate-200 rounded-lg">
                                      <PriceInput
                                        value={rowDraft.amount ?? ''}
                                        onChange={(value) => updateEditPaymentField(paymentManagerOrder.id, payment.id, 'amount', value)}
                                        placeholder="0"
                                      />
                                    </div>
                                  ) : (
                                    toPN(payment.amount.toLocaleString())
                                  )}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => saveEditedPayment(paymentManagerOrder, payment.id)}
                                          disabled={!rowAmountValid}
                                          className={`px-2 py-1 rounded text-[10px] font-black ${rowAmountValid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                        >
                                          ذخیره
                                        </button>
                                        <button
                                          onClick={() => cancelEditPayment(paymentManagerOrder.id, payment.id)}
                                          className="px-2 py-1 rounded text-[10px] font-black bg-slate-100 text-slate-600"
                                        >
                                          انصراف
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => beginEditPayment(paymentManagerOrder.id, payment)}
                                          className="px-2 py-1 rounded text-[10px] font-black bg-blue-100 text-blue-700"
                                        >
                                          ویرایش
                                        </button>
                                        <button
                                          onClick={() => removePayment(paymentManagerOrder, payment.id)}
                                          className="px-2 py-1 rounded text-[10px] font-black bg-rose-100 text-rose-700 inline-flex items-center gap-1"
                                        >
                                          <Trash2 size={11} />
                                          حذف
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={closePaymentManager}
                  className="h-9 px-3 rounded-lg text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  onClick={handlePaymentManagerSubmit}
                  disabled={paymentManagerSubmitDisabled}
                  className={`h-9 px-3 rounded-lg text-xs font-black ${paymentManagerSubmitDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {paymentManagerSubmitLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <PrintInvoice
          items={viewingOrder.items}
          catalog={catalog}
          profile={profile}
          customerName={viewingOrder.customerName}
          orderCode={viewingOrder.orderCode}
          date={viewingOrder.date}
          grandTotal={toSafeAmount(viewingOrder.total)}
          financials={viewingOrder.financials}
          payments={viewingOrder.payments}
          invoiceNotes={viewingOrder.invoiceNotes}
          type="factory"
          factoryIncludeNonProductionManual={Boolean(viewingOrder.factoryIncludeNonProductionManual)}
        />
      )}

      <PatternFilesModal
        isOpen={Boolean(patternFilesContext)}
        onClose={() => setPatternFilesContext(null)}
        orderCode={patternFilesContext?.orderCode}
        files={patternFilesContext?.files || []}
      />
    </div>
  );
};
