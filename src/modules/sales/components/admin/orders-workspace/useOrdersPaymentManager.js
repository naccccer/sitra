import { useMemo, useState } from 'react';
import { normalizePayment } from '@/modules/sales/domain/invoice';
import { resolveApiFileUrl } from '@/utils/url';
import { salesApi } from '@/modules/sales/services/salesApi';
import {
  ALLOWED_RECEIPT_EXTENSIONS,
  ALLOWED_RECEIPT_TYPES,
  buildFinancialsForOrder,
  createInvoiceAdjustmentsDraft,
  createPaymentDraft,
  defaultPaymentMethod,
  MAX_RECEIPT_SIZE,
  PAYMENT_MANAGER_TABS,
  paymentStatusPill,
  resolveOrderStageId,
} from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
export const useOrdersPaymentManager = ({ orders, setOrders, catalog }) => {
  const [paymentDraftsByOrder, setPaymentDraftsByOrder] = useState({});
  const [paymentTouchedByOrder, setPaymentTouchedByOrder] = useState({});
  const [paymentEditDrafts, setPaymentEditDrafts] = useState({});
  const [invoiceDraftsByOrder, setInvoiceDraftsByOrder] = useState({});
  const [paymentManagerOrderId, setPaymentManagerOrderId] = useState(null);
  const [paymentManagerActiveTab, setPaymentManagerActiveTab] = useState(PAYMENT_MANAGER_TABS[0].id);
  const [uploadingReceiptKey, setUploadingReceiptKey] = useState('');
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
      prev[order.id] ? prev : { ...prev, [order.id]: createInvoiceAdjustmentsDraft(order, catalog) }
    ));
  };
  const closePaymentManager = () => {
    setPaymentManagerOrderId(null);
    setPaymentManagerActiveTab(PAYMENT_MANAGER_TABS[0].id);
  };
  const handleOrderDeleted = (orderId) => {
    if (paymentManagerOrderId === orderId) closePaymentManager();
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
    const nextPayment = normalizePayment({ ...draft, amount: Math.round(amount) });
    const existing = (Array.isArray(order.payments) ? order.payments : []).map(normalizePayment);
    await upsertOrderPayments(order, [...existing, nextPayment]);
    setPaymentDraftsByOrder((prev) => ({ ...prev, [orderId]: createPaymentDraft() }));
    markOrderPaymentTouched(orderId, false);
  };
  const beginEditPayment = (orderId, payment) => {
    setPaymentEditDrafts((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), [payment.id]: { ...normalizePayment(payment) } },
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
    const nextPayments = existing.map((payment) => (
      payment.id === paymentId ? normalizePayment({ ...draft, amount: Math.round(amount) }) : payment
    ));
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
    if (file.size > MAX_RECEIPT_SIZE) return 'حجم رسید نباید بیشتر از ۱۰ مگابایت باشد.';
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
      filePath: resolveApiFileUrl(response?.filePath),
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
  const paymentManagerOrder = paymentManagerOrderId
    ? orders.find((candidate) => candidate.id === paymentManagerOrderId) || null
    : null;
  const paymentManagerPayments = useMemo(() => (
    paymentManagerOrder ? (Array.isArray(paymentManagerOrder.payments) ? paymentManagerOrder.payments : []).map(normalizePayment) : []
  ), [paymentManagerOrder]);
  const paymentManagerPaymentDraft = paymentManagerOrder ? getOrderPaymentDraft(paymentManagerOrder.id) : createPaymentDraft();
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
  return {
    paymentManagerOrder,
    paymentManagerPayments,
    paymentManagerPaymentDraft,
    paymentManagerPaymentTouched,
    paymentManagerPaymentAmountValid,
    paymentManagerInvoiceDraft,
    paymentManagerFinancials,
    paymentManagerStatusPill,
    paymentManagerSubmitLabel,
    paymentManagerSubmitDisabled,
    paymentManagerActiveTab,
    setPaymentManagerActiveTab,
    paymentEditDrafts,
    uploadingReceiptKey,
    openPaymentManager,
    closePaymentManager,
    handleOrderDeleted,
    updateOrderInvoiceDraft,
    updateOrderPaymentDraft,
    markOrderPaymentTouched,
    addPaymentForOrder,
    beginEditPayment,
    updateEditPaymentField,
    cancelEditPayment,
    saveEditedPayment,
    removePayment,
    uploadDraftReceipt,
    uploadEditedReceipt,
    handlePaymentManagerSubmit,
    defaultPaymentMethod,
  };
};
