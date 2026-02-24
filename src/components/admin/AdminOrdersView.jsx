import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Edit3, Archive, Printer, FileText, X, Upload, Link2, Trash2 } from 'lucide-react';
import { toPN } from '../../utils/helpers';
import { StructureDetails } from '../shared/StructureDetails';
import { PrintInvoice } from '../shared/PrintInvoice';
import { PatternFilesModal } from './PatternFilesModal';
import { api } from '../../services/api';
import { getPaymentMethodLabel, normalizePayment, PAYMENT_METHOD_OPTIONS } from '../../utils/invoice';

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
const createPaymentDraft = () => ({
  date: new Date().toLocaleDateString('fa-IR'),
  amount: '',
  method: defaultPaymentMethod,
  reference: '',
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

const buildFinancialsFromPayments = (order = {}, payments = []) => {
  const currentFinancials = order?.financials && typeof order.financials === 'object' ? order.financials : {};
  const normalizedPayments = (Array.isArray(payments) ? payments : []).map(normalizePayment);
  const total = toSafeAmount(currentFinancials?.grandTotal ?? order?.total);
  const paid = normalizedPayments.reduce((acc, payment) => acc + toSafeAmount(payment?.amount), 0);
  const due = Math.max(0, total - paid);
  const paymentStatus = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

  return {
    ...currentFinancials,
    subTotal: toSafeAmount(currentFinancials?.subTotal ?? total),
    itemDiscountTotal: toSafeAmount(currentFinancials?.itemDiscountTotal ?? 0),
    invoiceDiscountType: String(currentFinancials?.invoiceDiscountType || 'none'),
    invoiceDiscountValue: toSafeAmount(currentFinancials?.invoiceDiscountValue ?? 0),
    invoiceDiscountAmount: toSafeAmount(currentFinancials?.invoiceDiscountAmount ?? 0),
    taxEnabled: Boolean(currentFinancials?.taxEnabled ?? false),
    taxRate: toSafeAmount(currentFinancials?.taxRate ?? 10),
    taxAmount: toSafeAmount(currentFinancials?.taxAmount ?? 0),
    grandTotal: total,
    paidTotal: paid,
    dueAmount: due,
    paymentStatus,
  };
};

export const AdminOrdersView = ({ orders, setOrders, catalog, onEditOrder }) => {
  const [activeOrdersTab, setActiveOrdersTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [factoryPrintContext, setFactoryPrintContext] = useState(null);
  const [patternFilesContext, setPatternFilesContext] = useState(null);
  const [paymentDraftsByOrder, setPaymentDraftsByOrder] = useState({});
  const [paymentTouchedByOrder, setPaymentTouchedByOrder] = useState({});
  const [paymentEditDrafts, setPaymentEditDrafts] = useState({});
  const [uploadingReceiptKey, setUploadingReceiptKey] = useState('');

  const updateOrderStatus = async (id, status) => {
    const previousOrder = orders.find((o) => o.id === id);
    if (!previousOrder) return;

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    try {
      const response = await api.updateOrderStatus(id, status);
      if (response?.order) {
        setOrders((prev) => prev.map((o) => (o.id === id ? response.order : o)));
      }
    } catch (error) {
      console.error('Failed to update order status.', error);
      setOrders((prev) => prev.map((o) => (o.id === id ? previousOrder : o)));
      alert(error?.message || 'به‌روزرسانی وضعیت سفارش ناموفق بود.');
    }
  };

  const handleArchiveOrder = (id) => {
    updateOrderStatus(id, 'archived');
    if (expandedOrderId === id) setExpandedOrderId(null);
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

  const openFactoryPrintModal = (order) => {
    setFactoryPrintContext({
      order,
      includeNonProductionManual: true,
    });
  };

  const confirmFactoryPrint = () => {
    if (!factoryPrintContext?.order) return;
    const nextOrder = {
      ...factoryPrintContext.order,
      factoryIncludeNonProductionManual: Boolean(factoryPrintContext.includeNonProductionManual),
    };
    setViewingOrder(nextOrder);
    setFactoryPrintContext(null);
    setTimeout(() => window.print(), 100);
  };

  const getOrderPaymentDraft = (orderId) => paymentDraftsByOrder[orderId] || createPaymentDraft();
  const getOrderPaymentTouched = (orderId) => Boolean(paymentTouchedByOrder[orderId]);

  const updateOrderPaymentDraft = (orderId, field, value) => {
    setPaymentDraftsByOrder((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || createPaymentDraft()), [field]: value },
    }));
  };

  const markOrderPaymentTouched = (orderId, touched = true) => {
    setPaymentTouchedByOrder((prev) => ({ ...prev, [orderId]: touched }));
  };

  const upsertOrderPayments = async (order, nextPaymentsInput) => {
    const previousOrder = orders.find((candidate) => candidate.id === order.id);
    if (!previousOrder) return;

    const nextPayments = (Array.isArray(nextPaymentsInput) ? nextPaymentsInput : []).map(normalizePayment);
    const nextFinancials = buildFinancialsFromPayments(previousOrder, nextPayments);
    const optimisticOrder = {
      ...previousOrder,
      payments: nextPayments,
      financials: nextFinancials,
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
        invoiceNotes: previousOrder.invoiceNotes || '',
      };
      const response = await api.updateOrder(payload);
      if (response?.order) {
        setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? response.order : candidate)));
      }
    } catch (error) {
      console.error('Failed to update order payments.', error);
      setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? previousOrder : candidate)));
      alert(error?.message || 'به‌روزرسانی پرداخت‌ها ناموفق بود.');
    }
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

    const response = await api.uploadReceiptFile(file);
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

  return (
    <div className="space-y-4 animate-in slide-in-from-left-4">
      <div className="print-hide flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar gap-1">
          {[
            { id: 'all', label: 'همه سفارش‌ها' },
            { id: 'pending', label: 'در انتظار' },
            { id: 'processing', label: 'در حال تولید' },
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
                <th className="p-3 font-black text-center border-l border-slate-100">پرداخت‌شده</th>
                <th className="p-3 font-black text-center border-l border-slate-100">مانده</th>
                <th className="p-3 font-black text-center border-l border-slate-100">وضعیت مالی</th>
                <th className="p-3 font-black text-center border-l border-slate-100">وضعیت سفارش</th>
                <th className="p-3 font-black text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-400 font-bold">هیچ سفارشی یافت نشد.</td>
                </tr>
              ) : (
                filteredOrders.map((o, index) => {
                  const financialSummary = deriveFinancialSummary(o);
                  const paymentPill = paymentStatusPill(financialSummary.status);
                  const orderPayments = (Array.isArray(o.payments) ? o.payments : []).map(normalizePayment);
                  const paymentDraft = getOrderPaymentDraft(o.id);
                  const paymentAmountValid = Number(paymentDraft.amount) > 0;
                  const paymentDraftTouched = getOrderPaymentTouched(o.id);

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
                        <td className="p-3 text-center font-black text-slate-700 tabular-nums border-l border-slate-50">{toPN(financialSummary.paid.toLocaleString())}</td>
                        <td className="p-3 text-center font-black text-rose-600 tabular-nums border-l border-slate-50">{toPN(financialSummary.due.toLocaleString())}</td>
                        <td className="p-3 text-center border-l border-slate-50">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`text-[10px] font-black px-2 py-1 rounded ${paymentPill.className}`}>
                              {paymentPill.label}
                            </span>
                            <button
                              onClick={() => setExpandedOrderId(o.id)}
                              className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            >
                              مدیریت پرداخت
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center border-l border-slate-50">
                          {o.status === 'archived' ? (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">آرشیو شده</span>
                          ) : (
                            <select
                              value={o.status}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              className={`text-[10px] font-black px-2 py-1.5 rounded-md outline-none cursor-pointer appearance-none text-center ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}
                            >
                              <option value="pending">در انتظار</option>
                              <option value="processing">در حال تولید</option>
                              <option value="delivered">تحویل شده</option>
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => toggleOrderExpansion(o.id)} className={`p-1.5 rounded transition-colors ${expandedOrderId === o.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50'}`} title="مشاهده آیتم‌ها">
                              {expandedOrderId === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {o.status !== 'archived' && (
                              <>
                                <button onClick={() => onEditOrder(o)} className="text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 p-1.5 rounded transition-colors" title="ویرایش سفارش"><Edit3 size={14} /></button>
                                <button onClick={() => handleArchiveOrder(o.id)} className="text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-1.5 rounded transition-colors" title="بایگانی"><Archive size={14} /></button>
                              </>
                            )}
                            {o.status === 'archived' && (
                              <button onClick={() => updateOrderStatus(o.id, 'pending')} className="text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1.5 rounded text-[10px] font-bold transition-colors">بازیابی</button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedOrderId === o.id && (
                        <tr className="bg-slate-50/80 animate-in fade-in">
                          <td colSpan="11" className="p-0 border-b-2 border-slate-200">
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
                                  <button onClick={() => openFactoryPrintModal(o)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex gap-1 items-center font-bold shadow-sm transition-colors">
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

                              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                                <div className="flex flex-wrap gap-2 justify-between items-center">
                                  <h4 className="text-xs font-black text-slate-800">مدیریت پرداخت‌ها</h4>
                                  <span className="text-[10px] font-bold text-slate-500">روش‌ها: کارت به کارت، چک، نقد، سایر</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">تاریخ</label>
                                    <input
                                      type="text"
                                      value={paymentDraft.date}
                                      onChange={(e) => updateOrderPaymentDraft(o.id, 'date', e.target.value)}
                                      className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">مبلغ (تومان)</label>
                                    <input
                                      type="number"
                                      value={paymentDraft.amount}
                                      onChange={(e) => {
                                        updateOrderPaymentDraft(o.id, 'amount', e.target.value);
                                        markOrderPaymentTouched(o.id, true);
                                      }}
                                      className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                      dir="ltr"
                                    />
                                    {paymentDraftTouched && !paymentAmountValid && (
                                      <div className="text-[10px] font-bold text-rose-600">مبلغ باید بیشتر از صفر باشد.</div>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">روش پرداخت</label>
                                    <select
                                      value={paymentDraft.method}
                                      onChange={(e) => updateOrderPaymentDraft(o.id, 'method', e.target.value)}
                                      className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                    >
                                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">مرجع</label>
                                    <input
                                      type="text"
                                      value={paymentDraft.reference}
                                      onChange={(e) => updateOrderPaymentDraft(o.id, 'reference', e.target.value)}
                                      className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">یادداشت</label>
                                    <input
                                      type="text"
                                      value={paymentDraft.note}
                                      onChange={(e) => updateOrderPaymentDraft(o.id, 'note', e.target.value)}
                                      className="h-9 w-full bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600">رسید واریزی (اختیاری)</label>
                                    <div className="flex gap-1.5">
                                      <label htmlFor={`payment-receipt-${o.id}`} className="h-9 px-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-200">
                                        <Upload size={12} />
                                        {uploadingReceiptKey === `draft:${o.id}` ? 'در حال آپلود...' : 'آپلود رسید'}
                                      </label>
                                      <input
                                        id={`payment-receipt-${o.id}`}
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          uploadDraftReceipt(o.id, file);
                                          e.target.value = '';
                                        }}
                                      />
                                      {paymentDraft.receipt?.filePath && (
                                        <button
                                          onClick={() => updateOrderPaymentDraft(o.id, 'receipt', null)}
                                          className="h-9 px-2 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200"
                                        >
                                          حذف رسید
                                        </button>
                                      )}
                                    </div>
                                    {paymentDraft.receipt?.originalName && (
                                      <div className="text-[10px] font-bold text-slate-500 truncate">{paymentDraft.receipt.originalName}</div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <button
                                    onClick={() => addPaymentForOrder(o)}
                                    disabled={!paymentAmountValid}
                                    className={`h-9 px-3 rounded-lg text-xs font-black ${paymentAmountValid ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                  >
                                    افزودن پرداخت
                                  </button>
                                </div>

                                {orderPayments.length === 0 ? (
                                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs font-bold text-slate-500">هنوز پرداختی ثبت نشده است.</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[980px]">
                                      <thead className="bg-white text-slate-500 border-y border-slate-200">
                                        <tr>
                                          <th className="p-2 text-right font-black">تاریخ</th>
                                          <th className="p-2 text-right font-black">روش</th>
                                          <th className="p-2 text-right font-black">مرجع</th>
                                          <th className="p-2 text-right font-black">یادداشت</th>
                                          <th className="p-2 text-right font-black">رسید</th>
                                          <th className="p-2 text-left font-black">مبلغ</th>
                                          <th className="p-2 text-center font-black">عملیات</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {orderPayments.map((payment) => {
                                          const rowDraft = paymentEditDrafts?.[o.id]?.[payment.id];
                                          const isEditing = Boolean(rowDraft);
                                          const rowAmountValid = Number(rowDraft?.amount) > 0;

                                          return (
                                            <tr key={payment.id}>
                                              <td className="p-2">
                                                {isEditing ? (
                                                  <input
                                                    type="text"
                                                    value={rowDraft.date || ''}
                                                    onChange={(e) => updateEditPaymentField(o.id, payment.id, 'date', e.target.value)}
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
                                                    onChange={(e) => updateEditPaymentField(o.id, payment.id, 'method', e.target.value)}
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
                                                    value={rowDraft.reference || ''}
                                                    onChange={(e) => updateEditPaymentField(o.id, payment.id, 'reference', e.target.value)}
                                                    className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                                  />
                                                ) : (
                                                  <span className="font-bold text-slate-500">{payment.reference || '-'}</span>
                                                )}
                                              </td>
                                              <td className="p-2">
                                                {isEditing ? (
                                                  <input
                                                    type="text"
                                                    value={rowDraft.note || ''}
                                                    onChange={(e) => updateEditPaymentField(o.id, payment.id, 'note', e.target.value)}
                                                    className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                                  />
                                                ) : (
                                                  <span className="font-bold text-slate-500">{payment.note || '-'}</span>
                                                )}
                                              </td>
                                              <td className="p-2">
                                                {isEditing ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <label htmlFor={`edit-receipt-${o.id}-${payment.id}`} className="h-8 px-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1">
                                                      <Upload size={11} />
                                                      {uploadingReceiptKey === `edit:${o.id}:${payment.id}` ? 'در حال آپلود...' : 'آپلود'}
                                                    </label>
                                                    <input
                                                      id={`edit-receipt-${o.id}-${payment.id}`}
                                                      type="file"
                                                      accept="application/pdf,image/jpeg,image/png"
                                                      className="hidden"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        uploadEditedReceipt(o.id, payment.id, file);
                                                        e.target.value = '';
                                                      }}
                                                    />
                                                    {rowDraft.receipt?.filePath && (
                                                      <button
                                                        onClick={() => updateEditPaymentField(o.id, payment.id, 'receipt', null)}
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
                                                  <input
                                                    type="number"
                                                    value={rowDraft.amount ?? ''}
                                                    onChange={(e) => updateEditPaymentField(o.id, payment.id, 'amount', e.target.value)}
                                                    className="h-8 w-24 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold"
                                                    dir="ltr"
                                                  />
                                                ) : (
                                                  toPN(payment.amount.toLocaleString())
                                                )}
                                              </td>
                                              <td className="p-2">
                                                <div className="flex items-center justify-center gap-1.5">
                                                  {isEditing ? (
                                                    <>
                                                      <button
                                                        onClick={() => saveEditedPayment(o, payment.id)}
                                                        disabled={!rowAmountValid}
                                                        className={`px-2 py-1 rounded text-[10px] font-black ${rowAmountValid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                      >
                                                        ذخیره
                                                      </button>
                                                      <button
                                                        onClick={() => cancelEditPayment(o.id, payment.id)}
                                                        className="px-2 py-1 rounded text-[10px] font-black bg-slate-100 text-slate-600"
                                                      >
                                                        انصراف
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() => beginEditPayment(o.id, payment)}
                                                        className="px-2 py-1 rounded text-[10px] font-black bg-blue-100 text-blue-700"
                                                      >
                                                        ویرایش
                                                      </button>
                                                      <button
                                                        onClick={() => removePayment(o, payment.id)}
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
                                )}
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

      {factoryPrintContext && (
        <div className="fixed inset-0 bg-slate-900/50 z-[80] flex items-center justify-center p-4 print-hide">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="text-sm font-black">گزینه‌های چاپ کارخانه</div>
              <button onClick={() => setFactoryPrintContext(null)} className="p-1 rounded hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(factoryPrintContext.includeNonProductionManual)}
                  onChange={(e) => setFactoryPrintContext((prev) => ({ ...prev, includeNonProductionManual: e.target.checked }))}
                />
                <span>نمایش آیتم‌های دستی غیرتولیدی در نسخه کارخانه</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setFactoryPrintContext(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2 text-xs font-black">انصراف</button>
                <button onClick={confirmFactoryPrint} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-xs font-black">چاپ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <PrintInvoice
          items={viewingOrder.items}
          catalog={catalog}
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
