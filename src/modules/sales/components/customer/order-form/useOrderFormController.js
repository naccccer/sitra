import { useMemo, useState } from 'react';
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
  findMatchingGlassByTitleAndProcess,
  normalizeLoadedItem,
  parseIntSafe,
  parseNumber,
} from '@/modules/sales/components/customer/order-form/orderFormUtils';
import { createOrderFormHandlers } from '@/modules/sales/components/customer/order-form/orderFormHandlers';

const buildInitialConfig = (catalog) => {
  const suggestInterlayer = (totalThick) => {
    const rule = catalog.pvbLogic.find((item) => (
      totalThick >= item.minTotalThickness && totalThick <= item.maxTotalThickness
    ));
    return rule ? rule.defaultInterlayerId : catalog.connectors.interlayers[0]?.id;
  };

  return {
    operations: {},
    pattern: { type: 'none', fileName: '' },
    single: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    laminate: {
      glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      interlayerId: suggestInterlayer(8),
      glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    },
    double: {
      spacerId: catalog.connectors.spacers[0]?.id,
      pane1: {
        isLaminated: false,
        glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
        interlayerId: suggestInterlayer(8),
        glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      },
      pane2: {
        isLaminated: false,
        glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
        interlayerId: suggestInterlayer(8),
        glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      },
    },
  };
};

export const useOrderFormController = ({
  catalog,
  editingOrder,
  onCancelEdit,
  setOrders,
  staffMode,
}) => {
  const isStaffContext = staffMode || Boolean(editingOrder);
  const billing = ensureBillingSettings(catalog);

  const [activeTab, setActiveTab] = useState('double');
  const [dimensions, setDimensions] = useState({ width: '100', height: '100', count: '1' });
  const [modalMode, setModalMode] = useState(null);
  const [orderItems, setOrderItems] = useState(() => (
    editingOrder && Array.isArray(editingOrder.items) ? editingOrder.items.map(normalizeLoadedItem) : []
  ));
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemType, setEditingItemType] = useState('catalog');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: editingOrder ? editingOrder.customerName : '',
    phone: editingOrder ? editingOrder.phone : '',
  });
  const [invoiceNotes, setInvoiceNotes] = useState(editingOrder?.invoiceNotes || '');
  const [itemPricing, setItemPricing] = useState({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
  const [manualDraft, setManualDraft] = useState(createEmptyManualDraft);
  const [manualTouched, setManualTouched] = useState({});
  const [invoiceAdjustments] = useState({
    discountType: editingOrder?.financials?.invoiceDiscountType || 'none',
    discountValue: String(editingOrder?.financials?.invoiceDiscountValue ?? ''),
    taxEnabled: Boolean(editingOrder?.financials?.taxEnabled ?? billing.taxDefaultEnabled),
    taxRate: String(editingOrder?.financials?.taxRate ?? billing.taxRate),
  });
  const [payments, setPayments] = useState(() => (
    editingOrder?.payments && Array.isArray(editingOrder.payments) ? editingOrder.payments.map(normalizePayment) : []
  ));
  const [config, setConfig] = useState(() => buildInitialConfig(catalog));

  const suggestInterlayer = (totalThick) => {
    const rule = catalog.pvbLogic.find((item) => (
      totalThick >= item.minTotalThickness && totalThick <= item.maxTotalThickness
    ));
    return rule ? rule.defaultInterlayerId : catalog.connectors.interlayers[0]?.id;
  };

  const handleDimensionChange = (event) => {
    setDimensions((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const updateConfigLayer = (assembly, paneKey, subField, value, innerField = null) => {
    setConfig((previous) => {
      const nextConfig = JSON.parse(JSON.stringify(previous));
      if (innerField) nextConfig[assembly][paneKey][subField][innerField] = value;
      else if (subField) nextConfig[assembly][paneKey][subField] = value;
      else nextConfig[assembly][paneKey] = value;

      const isSekuritToggle = innerField === 'isSekurit'
        || subField === 'isSekurit'
        || (assembly === 'single' && paneKey === 'isSekurit');
      if (isSekuritToggle) {
        let glassLayer = null;
        if (assembly === 'single') glassLayer = nextConfig.single;
        else if (assembly === 'laminate' && (paneKey === 'glass1' || paneKey === 'glass2')) glassLayer = nextConfig.laminate[paneKey];
        else if (assembly === 'double' && (subField === 'glass1' || subField === 'glass2')) glassLayer = nextConfig.double[paneKey][subField];

        if (glassLayer) {
          const targetProcess = glassLayer.isSekurit ? 'sekurit' : 'raw';
          const matchedGlass = findMatchingGlassByTitleAndProcess(glassLayer.glassId, targetProcess, catalog);
          if (matchedGlass) glassLayer.glassId = matchedGlass.id;
        }
      }

      if ((innerField === 'thick' || subField === 'thick') && (assembly === 'laminate' || (assembly === 'double' && nextConfig.double[paneKey].isLaminated))) {
        if (assembly === 'laminate') {
          const total = nextConfig.laminate.glass1.thick + nextConfig.laminate.glass2.thick;
          nextConfig.laminate.interlayerId = suggestInterlayer(total);
        }
        if (assembly === 'double') {
          const total = nextConfig.double[paneKey].glass1.thick + nextConfig.double[paneKey].glass2.thick;
          nextConfig.double[paneKey].interlayerId = suggestInterlayer(total);
        }
      }
      return nextConfig;
    });
  };

  const { validationErrors, summaryErrors, unavailableLayers, pricingDetails } = usePricingCalculator(
    dimensions,
    activeTab,
    config,
    catalog,
  );

  const catalogPricingPreview = useMemo(() => buildCatalogPricingMeta({
    catalogUnitPrice: Math.max(0, parseIntSafe(pricingDetails.unitPrice, 0)),
    count: Math.max(1, parseIntSafe(dimensions.count, 1)),
    floorPercent: billing.priceFloorPercent,
    overrideUnitPrice: itemPricing.overrideUnitPrice,
    overrideReason: itemPricing.overrideReason,
    discountType: itemPricing.discountType,
    discountValue: itemPricing.discountValue,
  }), [billing.priceFloorPercent, dimensions.count, itemPricing, pricingDetails.unitPrice]);

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
  const manualErrors = useMemo(() => {
    const next = {};
    if (String(manualDraft.title || '').trim() === '') next.title = 'عنوان آیتم الزامی است.';
    if (manualQtyRaw === null || manualQtyRaw < 1) next.qty = 'تعداد باید حداقل ۱ باشد.';
    if (manualUnitPriceRaw === null || manualUnitPriceRaw <= 0) next.unitPrice = 'قیمت فی باید بیشتر از صفر باشد.';
    if (manualDraft.discountType === 'percent') {
      if (manualDiscountRaw === null) next.discountValue = 'درصد تخفیف را وارد کنید.';
      else if (manualDiscountRaw < 0 || manualDiscountRaw > 100) next.discountValue = 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.';
    }
    if (manualDraft.discountType === 'fixed') {
      if (manualDiscountRaw === null) next.discountValue = 'مبلغ تخفیف را وارد کنید.';
      else if (manualDiscountRaw < 0) next.discountValue = 'مبلغ تخفیف نمی‌تواند منفی باشد.';
      else if (manualDiscountRaw > manualBaseAmount) next.discountValue = 'تخفیف ثابت نمی‌تواند بیشتر از مبلغ پایه باشد.';
    }
    return next;
  }, [manualBaseAmount, manualDiscountRaw, manualDraft, manualQtyRaw, manualUnitPriceRaw]);
  const manualPreviewPricing = useMemo(() => buildManualPricingMeta({
    qty: Math.max(1, parseIntSafe(manualDraft.qty, 1)),
    unitPrice: Math.max(0, parseIntSafe(manualDraft.unitPrice, 0)),
    discountType: manualDraft.discountType,
    discountValue: manualDraft.discountValue,
  }), [manualDraft]);

  const manualCanSubmit = Object.keys(manualErrors).length === 0;
  const canAddCatalogItem = pricingDetails.total > 0 && validationErrors.length === 0;
  const grandTotal = financials.grandTotal;

  const handlers = createOrderFormHandlers({
    activeTab,
    canAddCatalogItem,
    catalogPricingPreview,
    config,
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
    orderItems,
    payments,
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
    summaryErrors,
    unavailableLayers,
    catalogPricingPreview,
    financials,
    grandTotal,
    canAddCatalogItem,
    ...handlers,
  };
};
