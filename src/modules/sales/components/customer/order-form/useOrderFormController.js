import { useEffect, useMemo, useState } from 'react';
import { usePricingCalculator } from '@/modules/sales/hooks/usePricingCalculator';
import {
  buildCatalogPricingMeta,
  buildManualPricingMeta,
  computeInvoiceFinancials,
  ensureBillingSettings,
  normalizePayment,
} from '@/modules/sales/domain/invoice';
import {
  createEmptyManualDraft,
  normalizeLoadedItem,
  parseIntSafe,
  parseNumber,
} from '@/modules/sales/components/customer/order-form/orderFormUtils';
import {
  buildCustomOrderItemPayload,
  createCustomDraft,
  normalizeCustomCatalogItems,
  resolveCustomDraftState,
} from '@/modules/sales/components/customer/order-form/customItemsDraft';
import { createOrderFormHandlers } from '@/modules/sales/components/customer/order-form/orderFormHandlers';
import { useOrderCustomerLinks } from '@/modules/sales/components/customer/order-form/useOrderCustomerLinks';
import { clearOrderCreateDraft, readOrderCreateDraft, writeOrderCreateDraft } from '@/modules/sales/components/customer/order-form/orderDraftStorage';
import { buildInitialConfig, resolveCatalogDefaults } from '@/modules/sales/components/customer/order-form/orderFormConfigDefaults';
import { buildManualErrors, createConfigLayerUpdater } from '@/modules/sales/components/customer/order-form/orderFormControllerHelpers';
export const useOrderFormController = ({
  catalog,
  editingOrder,
  onCancelEdit,
  setOrders,
  staffMode,
}) => {
  const [initialCreateDraft] = useState(() => (editingOrder ? null : readOrderCreateDraft()));

  const isStaffContext = staffMode || Boolean(editingOrder);
  const catalogDefaults = resolveCatalogDefaults(catalog);
  const billing = ensureBillingSettings(catalog);
  const customItems = useMemo(
    () => normalizeCustomCatalogItems(catalog).filter((item) => item.isActive),
    [catalog],
  );

  const [activeTab, setActiveTab] = useState(() => String(initialCreateDraft?.activeTab || 'double'));
  const [dimensions, setDimensions] = useState(() => initialCreateDraft?.dimensions || { width: '100', height: '100', count: '1' });
  const [modalMode, setModalMode] = useState(null);
  const [orderItems, setOrderItems] = useState(() => (
    editingOrder && Array.isArray(editingOrder.items)
      ? editingOrder.items.map(normalizeLoadedItem)
      : (Array.isArray(initialCreateDraft?.orderItems) ? initialCreateDraft.orderItems.map(normalizeLoadedItem) : [])
  ));
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemType, setEditingItemType] = useState('catalog');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(() => ({
    name: editingOrder ? editingOrder.customerName : String(initialCreateDraft?.customerInfo?.name || ''),
    phone: editingOrder ? editingOrder.phone : String(initialCreateDraft?.customerInfo?.phone || ''),
  }));
  const [invoiceNotes, setInvoiceNotes] = useState(() => editingOrder?.invoiceNotes || String(initialCreateDraft?.invoiceNotes || ''));
  const [itemPricing, setItemPricing] = useState({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
  const [manualDraft, setManualDraft] = useState(createEmptyManualDraft);
  const [manualTouched, setManualTouched] = useState({});
  const [customDraft, setCustomDraft] = useState(() => (
    initialCreateDraft?.customDraft && typeof initialCreateDraft.customDraft === 'object'
      ? {
        itemId: String(initialCreateDraft.customDraft.itemId || ''),
        unitPrice: String(initialCreateDraft.customDraft.unitPrice || ''),
      }
      : createCustomDraft(customItems)
  ));
  const [invoiceAdjustments] = useState({
    discountType: editingOrder?.financials?.invoiceDiscountType || 'none',
    discountValue: String(editingOrder?.financials?.invoiceDiscountValue ?? ''),
    taxEnabled: Boolean(editingOrder?.financials?.taxEnabled ?? billing.taxDefaultEnabled),
    taxRate: String(editingOrder?.financials?.taxRate ?? billing.taxRate),
  });
  const [payments, setPayments] = useState(() => (
    editingOrder?.payments && Array.isArray(editingOrder.payments)
      ? editingOrder.payments.map(normalizePayment)
      : (Array.isArray(initialCreateDraft?.payments) ? initialCreateDraft.payments.map(normalizePayment) : [])
  ));
  const [config, setConfig] = useState(() => initialCreateDraft?.config || buildInitialConfig(catalog));

  const customerLinks = useOrderCustomerLinks({
    isStaffContext,
    editingOrder,
    initialSelection: initialCreateDraft?.customerLinks || null,
    customerInfo,
    setCustomerInfo,
  });

  const resolvedCustomDraft = useMemo(() => {
    if (!customItems.length) return { itemId: '', unitPrice: '' };
    const selected = customItems.find((item) => item.id === String(customDraft?.itemId || '')) || customItems[0];
    return {
      itemId: selected.id,
      unitPrice: String(Math.max(0, parseIntSafe(customDraft?.unitPrice ?? selected.unitPrice, selected.unitPrice))),
    };
  }, [customDraft, customItems]);

  useEffect(() => {
    if (editingOrder) return;
    writeOrderCreateDraft({
      activeTab,
      dimensions,
      orderItems,
      customerInfo,
      invoiceNotes,
      payments,
      config,
      customDraft: resolvedCustomDraft,
      customerLinks: {
        customerId: customerLinks.selectedCustomerId,
        projectId: customerLinks.selectedProjectId,
        projectContactId: customerLinks.selectedProjectContactId,
      },
    });
  }, [activeTab, config, resolvedCustomDraft, customerInfo, customerLinks.selectedCustomerId, customerLinks.selectedProjectContactId, customerLinks.selectedProjectId, dimensions, editingOrder, invoiceNotes, orderItems, payments]);

  const handleDimensionChange = (event) => {
    setDimensions((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const updateConfigLayer = useMemo(
    () => createConfigLayerUpdater({ setConfig, catalogDefaults, catalog }),
    [catalog, catalogDefaults, setConfig],
  );

  const { validationErrors, summaryErrors, unavailableLayers, pricingDetails } = usePricingCalculator(dimensions, activeTab, config, catalog);

  const catalogPricingPreview = useMemo(() => buildCatalogPricingMeta({
    catalogUnitPrice: Math.max(0, parseIntSafe(pricingDetails.unitPrice, 0)),
    count: Math.max(1, parseIntSafe(dimensions.count, 1)),
    floorPercent: billing.priceFloorPercent,
    overrideUnitPrice: itemPricing.overrideUnitPrice,
    overrideReason: itemPricing.overrideReason,
    discountType: itemPricing.discountType,
    discountValue: itemPricing.discountValue,
    pricingUnit: 'm_square',
    pricingUnitFactor: pricingDetails.effectiveArea,
  }), [billing.priceFloorPercent, dimensions.count, itemPricing, pricingDetails.effectiveArea, pricingDetails.unitPrice]);

  const customDraftState = useMemo(
    () => resolveCustomDraftState({
      customItems,
      customDraft: resolvedCustomDraft,
      dimensions,
      config,
      catalog,
      billing,
      itemPricing,
      isStaffContext,
    }),
    [billing, catalog, config, customItems, dimensions, isStaffContext, itemPricing, resolvedCustomDraft],
  );

  const effectivePricingPreview = activeTab === 'custom' ? customDraftState.pricingMeta : catalogPricingPreview;

  const financials = useMemo(() => computeInvoiceFinancials({
    items: orderItems,
    invoiceDiscountType: invoiceAdjustments.discountType,
    invoiceDiscountValue: invoiceAdjustments.discountValue,
    taxEnabled: invoiceAdjustments.taxEnabled,
    taxRate: invoiceAdjustments.taxRate,
    payments,
  }), [invoiceAdjustments, orderItems, payments]);

  const manualQtyRaw = parseNumber(manualDraft.qty);
  const manualUnitPriceRaw = parseNumber(manualDraft.unitPrice);
  const manualDiscountRaw = parseNumber(manualDraft.discountValue);
  const manualBaseAmount = Math.max(0, Math.round((manualQtyRaw ?? 0) * (manualUnitPriceRaw ?? 0)));
  const manualErrors = useMemo(() => buildManualErrors({
    manualBaseAmount,
    manualDiscountRaw,
    manualDraft,
    manualQtyRaw,
    manualUnitPriceRaw,
  }), [manualBaseAmount, manualDiscountRaw, manualDraft, manualQtyRaw, manualUnitPriceRaw]);

  const manualPreviewPricing = useMemo(() => buildManualPricingMeta({
    qty: Math.max(1, parseIntSafe(manualDraft.qty, 1)),
    unitPrice: Math.max(0, parseIntSafe(manualDraft.unitPrice, 0)),
    discountType: manualDraft.discountType,
    discountValue: manualDraft.discountValue,
  }), [manualDraft]);

  const manualCanSubmit = Object.keys(manualErrors).length === 0;
  const canAddCatalogItem = activeTab === 'custom'
    ? customDraftState.canAdd
    : (pricingDetails.total > 0 && validationErrors.length === 0);
  const grandTotal = financials.grandTotal;

  const handlers = createOrderFormHandlers({
    activeTab,
    canAddCatalogItem,
    catalogPricingPreview: effectivePricingPreview,
    config,
    customDraft: resolvedCustomDraft,
    buildCustomOrderItemPayload,
    customDraftState,
    createCustomDraft,
    customItems,
    setCustomDraft,
    customerInfo,
    dimensions,
    editingItemId,
    editingItemType,
    editingOrder,
    financials,
    grandTotal,
    invoiceNotes,
    isStaffContext,
    manualCanSubmit,
    manualDraft,
    onCancelEdit,
    onClearCreateDraft: clearOrderCreateDraft,
    orderItems,
    payments,
    selectedCustomerId: customerLinks.selectedCustomerId,
    selectedProjectId: customerLinks.selectedProjectId,
    selectedProjectContactId: customerLinks.selectedProjectContactId,
    setActiveTab,
    setConfig,
    setCustomerInfo,
    setDimensions,
    setEditingItemId,
    setEditingItemType,
    setInvoiceNotes,
    setIsCheckoutOpen,
    setItemPricing,
    setManualDraft,
    setManualTouched,
    setModalMode,
    setOrderItems,
    setOrders,
    setPayments,
  });

  return {
    isStaffContext,
    activeTab,
    setActiveTab,
    dimensions,
    handleDimensionChange,
    modalMode,
    setModalMode,
    orderItems,
    editingItemId,
    editingItemType,
    isCheckoutOpen,
    setIsCheckoutOpen,
    customerInfo,
    customerLinks,
    invoiceNotes,
    payments,
    config,
    setConfig,
    updateConfigLayer,
    itemPricing,
    setItemPricing,
    manualDraft,
    manualTouched,
    manualErrors,
    manualPreviewPricing,
    manualCanSubmit,
    customItems,
    customDraft: resolvedCustomDraft,
    setCustomDraft,
    customDraftState,
    summaryErrors: activeTab === 'custom' ? [] : summaryErrors,
    unavailableLayers: activeTab === 'custom' ? {} : unavailableLayers,
    catalogPricingPreview: effectivePricingPreview,
    financials,
    grandTotal,
    canAddCatalogItem,
    ...handlers,
  };
};
