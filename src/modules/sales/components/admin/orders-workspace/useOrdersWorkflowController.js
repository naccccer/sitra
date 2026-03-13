import { useMemo, useState } from 'react';
import { normalizePayment } from '@/modules/sales/domain/invoice';
import { salesApi } from '@/modules/sales/services/salesApi';
import {
  extractPatternFiles,
  ORDER_STAGE_MAP,
  resolveOrderStageId,
  toSafeAmount,
} from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';

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
  expectedUpdatedAt: String(order.updatedAt || ''),
});

export const useOrdersWorkflowController = ({
  orders,
  setOrders,
  onLoadMoreOrders,
  onOrderDeleted = () => {},
}) => {
  const [activeOrdersTab, setActiveOrdersTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [patternFilesContext, setPatternFilesContext] = useState(null);

  const updateOrderStatus = async (id, status, expectedUpdatedAt = null) => {
    const previousOrder = orders.find((candidate) => candidate.id === id);
    if (!previousOrder) return;

    setOrders((prev) => prev.map((candidate) => (candidate.id === id ? { ...candidate, status } : candidate)));
    try {
      const response = await salesApi.updateOrderStatus(id, status, { expectedUpdatedAt });
      if (response?.order) {
        setOrders((prev) => prev.map((candidate) => (candidate.id === id ? response.order : candidate)));
      } else if (response?.queued) {
        setOrders((prev) => prev.map((candidate) => (
          candidate.id === id
            ? { ...candidate, status, offlineQueued: true, offlineQueueId: response?.queueItem?.queueId || null, updatedAt: new Date().toISOString() }
            : candidate
        )));
      }
    } catch (error) {
      console.error('Failed to update order status.', error);
      setOrders((prev) => prev.map((candidate) => (candidate.id === id ? previousOrder : candidate)));
      alert(error?.message || 'به‌روزرسانی وضعیت سفارش ناموفق بود.');
    }
  };

  const updateOrderWorkflowStage = async (order, stageId) => {
    const selectedStage = ORDER_STAGE_MAP[stageId] || ORDER_STAGE_MAP.registered;
    const previousOrder = orders.find((candidate) => candidate.id === order?.id);
    if (!previousOrder) return;

    const nextFinancials = {
      ...(previousOrder.financials && typeof previousOrder.financials === 'object' ? previousOrder.financials : {}),
      orderStage: selectedStage.id,
    };
    const optimisticOrder = { ...previousOrder, status: selectedStage.status, financials: nextFinancials };

    setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? optimisticOrder : candidate)));
    try {
      const payload = buildOrderUpdatePayload(previousOrder, selectedStage.status, nextFinancials);
      const response = await salesApi.updateOrder(payload);
      if (response?.order) {
        setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? response.order : candidate)));
      } else if (response?.queued) {
        setOrders((prev) => prev.map((candidate) => (
          candidate.id === previousOrder.id
            ? { ...optimisticOrder, offlineQueued: true, offlineQueueId: response?.queueItem?.queueId || null, updatedAt: new Date().toISOString() }
            : candidate
        )));
      }
    } catch (error) {
      console.error('Failed to update order workflow stage.', error);
      setOrders((prev) => prev.map((candidate) => (candidate.id === previousOrder.id ? previousOrder : candidate)));
      alert(error?.message || 'به‌روزرسانی وضعیت سفارش ناموفق بود.');
    }
  };

  const handleArchiveOrder = (order) => {
    if (!order?.id) return;
    updateOrderStatus(order.id, 'archived', order?.updatedAt || null);
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
    onOrderDeleted(orderId);

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
    setPatternFilesContext({ orderCode: order?.orderCode || '', files });
  };

  const printFactoryOrder = (order) => {
    if (!order) return;
    setViewingOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const handleLoadMoreOrders = async () => {
    if (!onLoadMoreOrders || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await onLoadMoreOrders();
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesTab = activeOrdersTab === 'all' ? order.status !== 'archived' : order.status === activeOrdersTab;
    const q = String(searchQuery || '');
    const matchesSearch = String(order.orderCode || '').includes(q)
      || String(order.customerName || '').includes(q)
      || String(order.phone || '').includes(q);
    return matchesTab && matchesSearch;
  }), [orders, activeOrdersTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const seed = { all: 0, pending: 0, processing: 0, delivered: 0, archived: 0 };
    return orders.reduce((acc, order) => {
      if (order.status !== 'archived') acc.all += 1;
      if (Object.prototype.hasOwnProperty.call(acc, order.status)) {
        acc[order.status] += 1;
      }
      return acc;
    }, seed);
  }, [orders]);

  return {
    activeOrdersTab,
    setActiveOrdersTab,
    searchQuery,
    setSearchQuery,
    expandedOrderId,
    viewingOrder,
    setViewingOrder,
    isLoadingMore,
    patternFilesContext,
    setPatternFilesContext,
    filteredOrders,
    tabCounts,
    updateOrderWorkflowStage,
    handleArchiveOrder,
    deleteArchivedOrder,
    toggleOrderExpansion,
    openPatternFilesModal,
    printFactoryOrder,
    handleLoadMoreOrders,
    resolveOrderStageId,
  };
};
