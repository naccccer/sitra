import { buildManualPricingMeta } from '@/modules/sales/domain/invoice';
import { createEmptyManualDraft, parseIntSafe } from '@/modules/sales/components/customer/order-form/orderFormUtils';
import { submitOrderPayload } from '@/modules/sales/components/customer/order-form/orderFormSubmitter';
import { resolvePricingDimensions } from '@/utils/catalogPricing';

const resolveOverrideInputValue = (item = {}) => {
  const rawOverride = item?.pricingMeta?.overrideUnitPrice;
  if (rawOverride === null || rawOverride === undefined || rawOverride === '') return '';
  if (item?.pricingMeta?.pricingUnit === 'm_square') return rawOverride;
  const isSquareMeterBased = item?.itemType !== 'manual'
    && (item?.itemType !== 'custom'
      || item?.custom?.unitCode === 'm_square'
      || item?.config?.unitCode === 'm_square');
  if (!isSquareMeterBased) return rawOverride;
  const storedFactor = Number(item?.pricingMeta?.pricingUnitFactor);
  if (Number.isFinite(storedFactor) && storedFactor > 0) {
    return Math.round(Number(rawOverride) / storedFactor);
  }
  const pricingDimensions = resolvePricingDimensions(item?.dimensions);
  if (!pricingDimensions.hasValidDimensions) return rawOverride;
  const effectiveArea = pricingDimensions.billableAreaM2;
  return effectiveArea > 0 ? Math.round(Number(rawOverride) / effectiveArea) : rawOverride;
};

export const createOrderFormHandlers = ({
  activeTab,
  canAddCatalogItem,
  catalogPricingPreview,
  config,
  customDraft,
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
  onClearCreateDraft,
  orderItems,
  payments,
  selectedCustomerId,
  selectedProjectId,
  selectedProjectContactId,
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
}) => {
  const resetManualEditor = () => {
    setEditingItemId(null);
    setEditingItemType('catalog');
    setManualTouched({});
    setManualDraft(createEmptyManualDraft());
  };

  const resetCustomEditor = () => {
    setEditingItemId(null);
    setEditingItemType('catalog');
    setCustomDraft(createCustomDraft(customItems));
    setItemPricing({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
    setConfig((previous) => ({ ...previous, operations: {}, pattern: { type: 'none', fileName: '' } }));
  };

  const handleAddToCart = () => {
    if (!canAddCatalogItem) return;

    if (activeTab === 'custom') {
      const nextItem = buildCustomOrderItemPayload({
        customDraft,
        customDraftState,
        dimensions,
        config,
        editingItemType,
        editingItemId,
      });

      if (editingItemType === 'custom' && editingItemId) {
        setOrderItems((previous) => previous.map((item) => (item.id === editingItemId ? nextItem : item)));
      } else {
        setOrderItems((previous) => [...previous, nextItem]);
      }

      resetCustomEditor();
      return;
    }

    const hasHoleMap = config.pattern?.type === 'hole_map'
      && Array.isArray(config.pattern?.holeMap?.holes)
      && config.pattern.holeMap.holes.length > 0;

    const nextItem = {
      id: editingItemType === 'catalog' && editingItemId ? editingItemId : Date.now(),
      itemType: 'catalog',
      title: activeTab === 'single' ? 'شیشه تک جداره' : activeTab === 'double' ? 'شیشه دوجداره' : 'شیشه لمینت',
      activeTab,
      dimensions: { ...dimensions },
      config: JSON.parse(JSON.stringify(config[activeTab])),
      operations: { ...config.operations },
      pattern: { ...config.pattern },
      requiresDrilling: hasHoleMap,
      unitPrice: catalogPricingPreview.finalUnitPrice,
      totalPrice: catalogPricingPreview.finalLineTotal,
      pricingMeta: { ...catalogPricingPreview },
    };

    if (editingItemType === 'catalog' && editingItemId) {
      setOrderItems((previous) => previous.map((item) => (item.id === editingItemId ? nextItem : item)));
    } else {
      setOrderItems((previous) => [...previous, nextItem]);
    }

    setEditingItemId(null);
    setEditingItemType('catalog');
    setItemPricing({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
    setConfig((previous) => ({ ...previous, operations: {}, pattern: { type: 'none', fileName: '' } }));
  };

  const handleAddManualItem = () => {
    setManualTouched((previous) => ({ ...previous, title: true, qty: true, unitPrice: true, discountValue: true }));
    if (!manualCanSubmit) return;

    const title = String(manualDraft.title || '').trim();
    const qty = Math.max(1, parseIntSafe(manualDraft.qty, 1));
    const unitPrice = Math.max(0, parseIntSafe(manualDraft.unitPrice, 0));
    if (title === '' || unitPrice <= 0) return;

    const pricingMeta = buildManualPricingMeta({
      qty,
      unitPrice,
      discountType: manualDraft.discountType,
      discountValue: manualDraft.discountValue,
    });
    const manualItem = {
      id: editingItemType === 'manual' && editingItemId ? editingItemId : Date.now(),
      itemType: 'manual',
      title,
      activeTab: 'manual',
      dimensions: { width: '-', height: '-', count: qty },
      config: {},
      operations: {},
      pattern: { type: 'none', fileName: '' },
      unitPrice: pricingMeta.finalUnitPrice,
      totalPrice: pricingMeta.finalLineTotal,
      pricingMeta,
      manual: {
        qty,
        unitLabel: String(manualDraft.unitLabel || 'عدد').trim() || 'عدد',
        description: String(manualDraft.description || ''),
        taxable: Boolean(manualDraft.taxable),
      },
    };

    if (editingItemType === 'manual' && editingItemId) {
      setOrderItems((previous) => previous.map((item) => (item.id === editingItemId ? manualItem : item)));
    } else {
      setOrderItems((previous) => [...previous, manualItem]);
    }

    resetManualEditor();
    setModalMode(null);
  };

  const handleEditItemClick = (item) => {
    if (item?.itemType === 'manual') {
      setModalMode('manualItem');
      setEditingItemId(item.id);
      setEditingItemType('manual');
      setManualTouched({});
      setManualDraft({
        title: item.title || '',
        qty: String(item?.manual?.qty ?? item?.dimensions?.count ?? 1),
        unitLabel: item?.manual?.unitLabel || 'عدد',
        unitPrice: String(item?.pricingMeta?.catalogUnitPrice ?? item?.unitPrice ?? ''),
        description: item?.manual?.description || '',
        taxable: Boolean(item?.manual?.taxable ?? true),
        discountType: item?.pricingMeta?.itemDiscountType || 'none',
        discountValue: String(item?.pricingMeta?.itemDiscountValue ?? ''),
      });
      return;
    }

    if (item?.itemType === 'custom' || item?.activeTab === 'custom') {
      setActiveTab('custom');
      setEditingItemId(item.id);
      setEditingItemType('custom');
      setDimensions({
        width: String(item?.dimensions?.width ?? ''),
        height: String(item?.dimensions?.height ?? ''),
        count: String(item?.dimensions?.count ?? 1),
      });
      setConfig((previous) => ({
        ...previous,
        operations: item?.operations && typeof item.operations === 'object' ? item.operations : {},
        pattern: item?.pattern && typeof item.pattern === 'object' ? item.pattern : { type: 'none', fileName: '' },
      }));
      setItemPricing({
        overrideUnitPrice: resolveOverrideInputValue(item),
        overrideReason: '',
        discountType: item?.pricingMeta?.itemDiscountType || 'none',
        discountValue: String(item?.pricingMeta?.itemDiscountValue ?? ''),
      });
      setCustomDraft({
        itemId: String(item?.custom?.id || item?.config?.customItemId || ''),
        unitPrice: String(item?.custom?.baseUnitPrice ?? item?.pricingMeta?.catalogUnitPrice ?? item?.unitPrice ?? ''),
      });
      return;
    }

    setActiveTab(item.activeTab);
    setDimensions(item.dimensions);
    setConfig((previous) => ({
      ...previous,
      [item.activeTab]: JSON.parse(JSON.stringify(item.config)),
      operations: item.operations,
      pattern: item.pattern,
    }));
    setEditingItemId(item.id);
    setEditingItemType('catalog');
    setItemPricing({
      overrideUnitPrice: resolveOverrideInputValue(item),
      overrideReason: '',
      discountType: 'none',
      discountValue: '',
    });
  };

  const cancelManualEdit = () => resetManualEditor();

  const handleRemoveItem = (itemId) => {
    setOrderItems((previous) => previous.filter((item) => item.id !== itemId));
    if (editingItemId !== itemId) return;
    setItemPricing({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
    resetManualEditor();
    resetCustomEditor();
  };

  const handleManualFieldChange = (field, value) => {
    setManualDraft((previous) => ({ ...previous, [field]: value }));
    setManualTouched((previous) => ({ ...previous, [field]: true }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo((previous) => ({ ...previous, [field]: value }));
  };
  const submitOrderToServer = () => submitOrderPayload({
    customerInfo,
    editingOrder,
    financials,
    grandTotal,
    invoiceNotes,
    isStaffContext,
    onCancelEdit,
    onClearCreateDraft,
    orderItems,
    payments,
    selectedCustomerId,
    selectedProjectContactId,
    selectedProjectId,
    setCustomerInfo,
    setEditingItemId,
    setEditingItemType,
    setInvoiceNotes,
    setIsCheckoutOpen,
    setOrderItems,
    setOrders,
    setPayments,
  });
  return {
    handleAddToCart,
    handleAddManualItem,
    handleEditItemClick,
    cancelManualEdit,
    handleRemoveItem,
    handleManualFieldChange,
    handleCustomerInfoChange,
    submitOrderToServer,
  };
};
