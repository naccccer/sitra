import React, { useMemo, useState } from 'react';
import { 
  Ruler, Plus, Settings, Layers, Flame, 
  Trash2, Edit3, Printer, CheckCircle2,
  User, Phone, Save, Menu, ShieldAlert
} from 'lucide-react';
import { toPN, generateOrderCode } from '../../utils/helpers';
import { usePricingCalculator } from '../../hooks/usePricingCalculator';
import { StructureDetails } from '../shared/StructureDetails';
import { SettingsModal } from './SettingsModal';
import { PrintInvoice } from '../shared/PrintInvoice';
import { api } from '../../services/api';
import {
  buildCatalogPricingMeta,
  buildManualPricingMeta,
  computeInvoiceFinancials,
  ensureBillingSettings,
  normalizePayment,
} from '../../utils/invoice';

// --- Sub-components (Moved OUTSIDE the main component to fix rendering bug) ---

const normalizeGlassTitle = (title) => (title || '').toString().trim().toLowerCase();
const glassProcess = (glass) => glass?.process || 'raw';

const findMatchingGlassByTitleAndProcess = (currentGlassId, targetProcess, catalog) => {
  const currentGlass = catalog.glasses.find(g => g.id === currentGlassId);
  if (!currentGlass) return null;
  if (glassProcess(currentGlass) === targetProcess) return currentGlass;

  const currentTitle = normalizeGlassTitle(currentGlass.title);
  return catalog.glasses.find(g => normalizeGlassTitle(g.title) === currentTitle && glassProcess(g) === targetProcess) || null;
};

const parseIntSafe = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
};

const parseNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
};

const createEmptyManualDraft = () => ({
  title: '',
  qty: '1',
  unitLabel: 'عدد',
  unitPrice: '',
  description: '',
  taxable: true,
  productionImpact: false,
  discountType: 'none',
  discountValue: '',
});

const normalizeLoadedItem = (item) => {
  if (!item || typeof item !== 'object') return item;

  const itemType = item.itemType === 'manual' ? 'manual' : 'catalog';
  const count = Math.max(1, parseIntSafe(item?.dimensions?.count ?? item?.manual?.qty ?? 1, 1));
  const unitPrice = Math.max(0, parseIntSafe(item?.unitPrice ?? 0, 0));
  const totalPrice = Math.max(0, parseIntSafe(item?.totalPrice ?? unitPrice * count, unitPrice * count));
  const pricingMeta = item?.pricingMeta && typeof item.pricingMeta === 'object'
    ? item.pricingMeta
    : (itemType === 'manual'
      ? buildManualPricingMeta({ qty: count, unitPrice, discountType: 'none', discountValue: 0 })
      : buildCatalogPricingMeta({
        catalogUnitPrice: unitPrice,
        count,
        floorPercent: 90,
        overrideUnitPrice: null,
        overrideReason: '',
        discountType: 'none',
        discountValue: 0,
      }));

  return {
    ...item,
    itemType,
    dimensions: {
      width: item?.dimensions?.width ?? '-',
      height: item?.dimensions?.height ?? '-',
      count,
    },
    unitPrice: Math.max(0, parseIntSafe(pricingMeta.finalUnitPrice ?? unitPrice, unitPrice)),
    totalPrice: Math.max(0, parseIntSafe(pricingMeta.finalLineTotal ?? totalPrice, totalPrice)),
    pricingMeta: {
      catalogUnitPrice: Math.max(0, parseIntSafe(pricingMeta.catalogUnitPrice ?? unitPrice, unitPrice)),
      catalogLineTotal: Math.max(0, parseIntSafe(pricingMeta.catalogLineTotal ?? totalPrice, totalPrice)),
      overrideUnitPrice: pricingMeta.overrideUnitPrice === null || pricingMeta.overrideUnitPrice === '' ? null : Math.max(0, parseIntSafe(pricingMeta.overrideUnitPrice, 0)),
      overrideReason: String(pricingMeta.overrideReason || ''),
      floorUnitPrice: Math.max(0, parseIntSafe(pricingMeta.floorUnitPrice ?? unitPrice, unitPrice)),
      isBelowFloor: Boolean(pricingMeta.isBelowFloor),
      itemDiscountType: pricingMeta.itemDiscountType === 'percent' || pricingMeta.itemDiscountType === 'fixed' ? pricingMeta.itemDiscountType : 'none',
      itemDiscountValue: Math.max(0, parseIntSafe(pricingMeta.itemDiscountValue ?? 0, 0)),
      itemDiscountAmount: Math.max(0, parseIntSafe(pricingMeta.itemDiscountAmount ?? 0, 0)),
      finalUnitPrice: Math.max(0, parseIntSafe(pricingMeta.finalUnitPrice ?? unitPrice, unitPrice)),
      finalLineTotal: Math.max(0, parseIntSafe(pricingMeta.finalLineTotal ?? totalPrice, totalPrice)),
    },
    manual: itemType === 'manual'
      ? {
        qty: count,
        unitLabel: String(item?.manual?.unitLabel || 'عدد'),
        description: String(item?.manual?.description || ''),
        taxable: Boolean(item?.manual?.taxable ?? true),
        productionImpact: Boolean(item?.manual?.productionImpact ?? false),
      }
      : undefined,
  };
};
const GlassRow = ({ data, onChange, catalog, layerKey, isUnavailable = false }) => {
  const targetProcess = data.isSekurit ? 'sekurit' : 'raw';
  const glassOptions = catalog.glasses.filter(g => glassProcess(g) === targetProcess);
  const selectedGlass = catalog.glasses.find(g => g.id === data.glassId);
  const selectedExistsInOptions = glassOptions.some(g => g.id === data.glassId);
  const layerLabel = isUnavailable ? 'ناموجود' : 'شیشه';

  return (
    <div data-layer-key={layerKey} className={`flex border rounded-xl overflow-hidden shadow-sm h-11 relative mx-1 ${isUnavailable ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
      <div className={`${isUnavailable ? 'bg-red-600' : 'bg-slate-900'} w-8 flex items-center justify-center text-[10px] font-black text-white shrink-0`} style={{ writingMode: 'vertical-rl' }}><span className="rotate-180">{layerLabel}</span></div>
      <div className={`flex-1 p-1 flex gap-1.5 items-center ${isUnavailable ? 'bg-red-50/20' : 'bg-white'}`}>
        <select value={data.glassId} onChange={e => onChange('glassId', e.target.value)} className={`flex-[2] bg-slate-50 text-[11px] font-black px-2 py-1.5 rounded-lg outline-none border h-full ${isUnavailable ? 'border-red-300 text-red-700' : 'border-slate-200'}`}>
          {!selectedExistsInOptions && selectedGlass && <option value={selectedGlass.id}>{selectedGlass.title} (ناموجود)</option>}
          {glassOptions.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <select value={data.thick} onChange={e => onChange('thick', parseInt(e.target.value, 10))} className="w-20 bg-slate-50 text-[11px] font-black px-2 py-1.5 rounded-lg outline-none border border-slate-200 text-center h-full">
          {catalog.thicknesses.map(t => <option key={t} value={t}>{toPN(t)} میل</option>)}
        </select>
        <label className={`flex-[1] h-full rounded-lg flex items-center justify-center gap-1 text-[10px] font-black border cursor-pointer ${data.isSekurit ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-400'}`}>
          <input type="checkbox" checked={data.isSekurit} onChange={e => onChange('isSekurit', e.target.checked)} className="hidden"/><Flame size={12}/> سکوریت
        </label>
        <label className={`flex-[1] h-full rounded-lg flex items-center justify-center gap-1 text-[10px] font-black border cursor-pointer ${data.hasEdge ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
          <input type="checkbox" checked={data.hasEdge} onChange={e => onChange('hasEdge', e.target.checked)} className="hidden"/><Ruler size={12}/> ابزار
        </label>
      </div>
    </div>
  );
};
const ConnectorRow = ({ value, onChange, type, catalog }) => {
  if (type === 'interlayer') return <div className="flex justify-center py-1"><div className="w-24 h-1.5 bg-indigo-200 rounded-full opacity-60"></div></div>;
  return (
    <div className="flex justify-center py-2 -my-2 z-20 relative">
      <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-sm">
        <Layers size={14} className="text-blue-500"/>
        <select value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-xs font-black outline-none text-blue-700">
          {catalog.connectors.spacers.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
    </div>
  );
};

const LaminatedPaneEditor = ({ assembly, paneKey, config, updateConfigLayer, catalog, unavailableLayers = {} }) => {
  const pData = config[assembly][paneKey];
  const layer1Key = `${assembly}.${paneKey}.glass1`;
  const layer2Key = `${assembly}.${paneKey}.glass2`;
  return (
    <div className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-sm mb-1.5 overflow-hidden">
      <div className="flex justify-between items-center bg-slate-50 px-4 py-2 border-b border-slate-200">
        <span className="text-xs font-black text-slate-800">{paneKey === 'pane1' ? 'جداره بیرونی' : 'جداره داخلی'}</span>
        <label className="flex items-center gap-2 cursor-pointer flex-row-reverse">
          <span className="text-[10px] font-bold text-slate-500">تبدیل به لمینت</span>
          <input type="checkbox" checked={pData.isLaminated} onChange={e => updateConfigLayer(assembly, paneKey, 'isLaminated', e.target.checked)} className="hidden" />
          <div className={`w-8 h-4.5 rounded-full flex items-center p-0.5 transition-all ${pData.isLaminated ? 'bg-indigo-400' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform ${pData.isLaminated ? '-translate-x-3.5' : ''}`}></div></div>
        </label>
      </div>
      <div className={`p-2.5 bg-slate-50/50 ${pData.isLaminated ? 'space-y-1.5' : ''}`}>
        <GlassRow layerKey={layer1Key} isUnavailable={Boolean(unavailableLayers[layer1Key])} data={pData.glass1} onChange={(f, v) => updateConfigLayer(assembly, paneKey, 'glass1', v, f)} catalog={catalog} />
        {pData.isLaminated && <><ConnectorRow type="interlayer" /><GlassRow layerKey={layer2Key} isUnavailable={Boolean(unavailableLayers[layer2Key])} data={pData.glass2} onChange={(f, v) => updateConfigLayer(assembly, paneKey, 'glass2', v, f)} catalog={catalog} /></>}
      </div>
    </div>
  );
};

// --- Main Order Form ---

export const OrderForm = ({ catalog, orders, setOrders, editingOrder = null, onCancelEdit, onGoToLogin, orderSource = 'customer', staffMode = false }) => {
  const isStaffContext = staffMode || Boolean(editingOrder);
  const billing = ensureBillingSettings(catalog);

  const [activeTab, setActiveTab] = useState('double');
  const [dimensions, setDimensions] = useState({ width: '100', height: '100', count: '1' });
  const [modalMode, setModalMode] = useState(null);
  const [orderItems, setOrderItems] = useState(editingOrder ? (Array.isArray(editingOrder.items) ? editingOrder.items.map(normalizeLoadedItem) : []) : []);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemType, setEditingItemType] = useState('catalog');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: editingOrder ? editingOrder.customerName : '', phone: editingOrder ? editingOrder.phone : '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState(editingOrder?.invoiceNotes || '');

  const [itemPricing, setItemPricing] = useState({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
  const [manualDraft, setManualDraft] = useState(createEmptyManualDraft);
  const [manualTouched, setManualTouched] = useState({});
  const [invoiceAdjustments, setInvoiceAdjustments] = useState({
    discountType: editingOrder?.financials?.invoiceDiscountType || 'none',
    discountValue: String(editingOrder?.financials?.invoiceDiscountValue ?? ''),
    taxEnabled: Boolean(editingOrder?.financials?.taxEnabled ?? billing.taxDefaultEnabled),
    taxRate: String(editingOrder?.financials?.taxRate ?? billing.taxRate),
  });
  const [payments, setPayments] = useState(editingOrder?.payments && Array.isArray(editingOrder.payments) ? editingOrder.payments.map(normalizePayment) : []);

  const pvbLogicSuggest = (totalThick) => {
    const rule = catalog.pvbLogic.find((r) => totalThick >= r.minTotalThickness && totalThick <= r.maxTotalThickness);
    return rule ? rule.defaultInterlayerId : catalog.connectors.interlayers[0]?.id;
  };

  const [config, setConfig] = useState({
    operations: {}, pattern: { type: 'none', fileName: '' },
    single: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    laminate: { glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } },
    double: {
      spacerId: catalog.connectors.spacers[0]?.id,
      pane1: { isLaminated: false, glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } },
      pane2: { isLaminated: false, glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } },
    },
  });

  const handleDimensionChange = (e) => setDimensions((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const updateConfigLayer = (assembly, paneKey, subField, v, innerField = null) => {
    setConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (innerField) newConfig[assembly][paneKey][subField][innerField] = v;
      else if (subField) newConfig[assembly][paneKey][subField] = v;
      else newConfig[assembly][paneKey] = v;

      const isSekuritToggle = innerField === 'isSekurit' || subField === 'isSekurit' || (assembly === 'single' && paneKey === 'isSekurit');
      if (isSekuritToggle) {
        let glassLayer = null;
        if (assembly === 'single') glassLayer = newConfig.single;
        else if (assembly === 'laminate' && (paneKey === 'glass1' || paneKey === 'glass2')) glassLayer = newConfig.laminate[paneKey];
        else if (assembly === 'double' && (subField === 'glass1' || subField === 'glass2')) glassLayer = newConfig.double[paneKey][subField];

        if (glassLayer) {
          const targetProcess = glassLayer.isSekurit ? 'sekurit' : 'raw';
          const matchedGlass = findMatchingGlassByTitleAndProcess(glassLayer.glassId, targetProcess, catalog);
          if (matchedGlass) glassLayer.glassId = matchedGlass.id;
        }
      }

      if ((innerField === 'thick' || subField === 'thick') && (assembly === 'laminate' || (assembly === 'double' && newConfig.double[paneKey].isLaminated))) {
        let t1 = 0; let t2 = 0;
        if (assembly === 'laminate') { t1 = newConfig.laminate.glass1.thick; t2 = newConfig.laminate.glass2.thick; newConfig.laminate.interlayerId = pvbLogicSuggest(t1 + t2); }
        if (assembly === 'double') { t1 = newConfig.double[paneKey].glass1.thick; t2 = newConfig.double[paneKey].glass2.thick; newConfig.double[paneKey].interlayerId = pvbLogicSuggest(t1 + t2); }
      }
      return newConfig;
    });
  };

  const { validationErrors, summaryErrors, unavailableLayers, pricingDetails } = usePricingCalculator(dimensions, activeTab, config, catalog);

  const catalogPricingPreview = useMemo(() => buildCatalogPricingMeta({
    catalogUnitPrice: Math.max(0, parseIntSafe(pricingDetails.unitPrice, 0)),
    count: Math.max(1, parseIntSafe(dimensions.count, 1)),
    floorPercent: billing.priceFloorPercent,
    overrideUnitPrice: itemPricing.overrideUnitPrice,
    overrideReason: itemPricing.overrideReason,
    discountType: itemPricing.discountType,
    discountValue: itemPricing.discountValue,
  }), [pricingDetails.unitPrice, dimensions.count, billing.priceFloorPercent, itemPricing]);

  const financials = useMemo(() => computeInvoiceFinancials({
    items: orderItems,
    invoiceDiscountType: invoiceAdjustments.discountType,
    invoiceDiscountValue: invoiceAdjustments.discountValue,
    taxEnabled: invoiceAdjustments.taxEnabled,
    taxRate: invoiceAdjustments.taxRate,
    payments,
  }), [orderItems, invoiceAdjustments, payments]);

  const manualQtyRaw = parseNumber(manualDraft.qty);
  const manualUnitPriceRaw = parseNumber(manualDraft.unitPrice);
  const manualDiscountRaw = parseNumber(manualDraft.discountValue);
  const manualBaseAmount = Math.max(0, Math.round((manualQtyRaw ?? 0) * (manualUnitPriceRaw ?? 0)));

  const manualErrors = useMemo(() => {
    const next = {};
    if (String(manualDraft.title || '').trim() === '') {
      next.title = 'عنوان آیتم الزامی است.';
    }
    if (manualQtyRaw === null || manualQtyRaw < 1) {
      next.qty = 'تعداد باید حداقل ۱ باشد.';
    }
    if (manualUnitPriceRaw === null || manualUnitPriceRaw <= 0) {
      next.unitPrice = 'قیمت فی باید بیشتر از صفر باشد.';
    }

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
  }, [manualDraft, manualQtyRaw, manualUnitPriceRaw, manualDiscountRaw, manualBaseAmount]);

  const manualPreviewPricing = useMemo(() => buildManualPricingMeta({
    qty: Math.max(1, parseIntSafe(manualDraft.qty, 1)),
    unitPrice: Math.max(0, parseIntSafe(manualDraft.unitPrice, 0)),
    discountType: manualDraft.discountType,
    discountValue: manualDraft.discountValue,
  }), [manualDraft]);

  const manualCanSubmit = Object.keys(manualErrors).length === 0;
  const paymentStatusMeta = financials.paymentStatus === 'paid'
    ? { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' }
    : financials.paymentStatus === 'partial'
      ? { label: 'تسویه ناقص', className: 'bg-amber-100 text-amber-700' }
      : { label: 'تسویه نشده', className: 'bg-rose-100 text-rose-700' };

  const grandTotal = financials.grandTotal;
  const canAddCatalogItem = pricingDetails.total > 0 && validationErrors.length === 0 && (!catalogPricingPreview.isBelowFloor || catalogPricingPreview.overrideReason.trim() !== '');

  const handleAddToCart = () => {
    if (!canAddCatalogItem) return;
    if (catalogPricingPreview.isBelowFloor && !catalogPricingPreview.overrideReason.trim()) return;

    const newItem = {
      id: editingItemType === 'catalog' && editingItemId ? editingItemId : Date.now(),
      itemType: 'catalog',
      title: activeTab === 'single' ? 'شیشه تک جداره' : activeTab === 'double' ? 'شیشه دوجداره' : 'شیشه لمینت',
      activeTab,
      dimensions: { ...dimensions },
      config: JSON.parse(JSON.stringify(config[activeTab])),
      operations: { ...config.operations },
      pattern: { ...config.pattern },
      unitPrice: catalogPricingPreview.finalUnitPrice,
      totalPrice: catalogPricingPreview.finalLineTotal,
      pricingMeta: { ...catalogPricingPreview },
    };

    if (editingItemType === 'catalog' && editingItemId) setOrderItems((prev) => prev.map((i) => (i.id === editingItemId ? newItem : i)));
    else setOrderItems((prev) => [...prev, newItem]);

    setEditingItemId(null);
    setEditingItemType('catalog');
    setItemPricing({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
    setConfig((prev) => ({ ...prev, operations: {}, pattern: { type: 'none', fileName: '' } }));
  };

  const handleAddManualItem = () => {
    setManualTouched((prev) => ({ ...prev, title: true, qty: true, unitPrice: true, discountValue: true }));
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
        productionImpact: Boolean(manualDraft.productionImpact),
      },
    };

    if (editingItemType === 'manual' && editingItemId) setOrderItems((prev) => prev.map((i) => (i.id === editingItemId ? manualItem : i)));
    else setOrderItems((prev) => [...prev, manualItem]);

    setEditingItemId(null);
    setEditingItemType('catalog');
    setManualTouched({});
    setManualDraft(createEmptyManualDraft());
  };

  const handleEditItemClick = (item) => {
    if (item?.itemType === 'manual') {
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
        productionImpact: Boolean(item?.manual?.productionImpact ?? false),
        discountType: item?.pricingMeta?.itemDiscountType || 'none',
        discountValue: String(item?.pricingMeta?.itemDiscountValue ?? ''),
      });
      return;
    }

    setActiveTab(item.activeTab);
    setDimensions(item.dimensions);
    setConfig((prev) => ({ ...prev, [item.activeTab]: JSON.parse(JSON.stringify(item.config)), operations: item.operations, pattern: item.pattern }));
    setEditingItemId(item.id);
    setEditingItemType('catalog');
    setItemPricing({
      overrideUnitPrice: item?.pricingMeta?.overrideUnitPrice ?? '',
      overrideReason: item?.pricingMeta?.overrideReason || '',
      discountType: item?.pricingMeta?.itemDiscountType || 'none',
      discountValue: String(item?.pricingMeta?.itemDiscountValue ?? ''),
    });
  };

  const cancelManualEdit = () => {
    setEditingItemId(null);
    setEditingItemType('catalog');
    setManualTouched({});
    setManualDraft(createEmptyManualDraft());
  };

  const handleRemoveItem = (itemId) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    if (editingItemId !== itemId) return;

    setEditingItemId(null);
    setEditingItemType('catalog');
    setItemPricing({ overrideUnitPrice: '', overrideReason: '', discountType: 'none', discountValue: '' });
    setManualTouched({});
    setManualDraft(createEmptyManualDraft());
  };

  const handleManualFieldChange = (field, value) => {
    setManualDraft((prev) => ({ ...prev, [field]: value }));
    setManualTouched((prev) => ({ ...prev, [field]: true }));
  };

  const submitOrderToServer = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      alert('لطفاً نام و شماره تماس را وارد کنید.');
      return;
    }

    try {
      if (editingOrder) {
        const updatePayload = {
          id: Number(editingOrder.id),
          customerName: customerInfo.name,
          phone: customerInfo.phone,
          date: editingOrder.date,
          total: grandTotal,
          status: editingOrder.status || 'pending',
          items: [...orderItems],
          financials,
          payments,
          invoiceNotes,
        };

        const response = await api.updateOrder(updatePayload);
        const updatedOrder = response?.order ?? { ...editingOrder, ...updatePayload };
        setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updatedOrder : o)));
        alert('سفارش با موفقیت ویرایش شد.');
        onCancelEdit();
        return;
      }

      const code = generateOrderCode(orderItems, orderSource, orders.length + 1);
      const createPayload = {
        orderCode: code,
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        date: new Date().toLocaleDateString('fa-IR'),
        total: isStaffContext ? grandTotal : orderItems.reduce((acc, item) => acc + Math.max(0, parseIntSafe(item.totalPrice, 0)), 0),
        status: 'pending',
        items: [...orderItems],
      };

      if (isStaffContext) {
        createPayload.financials = financials;
        createPayload.payments = payments;
        createPayload.invoiceNotes = invoiceNotes;
      }

      const response = await api.createOrder(createPayload);
      const createdOrder = response?.order ?? { id: code, ...createPayload };
      setOrders((prev) => [createdOrder, ...prev]);
      alert(`سفارش ثبت شد. کد پیگیری: ${createdOrder.orderCode || code}`);

      setOrderItems([]);
      setPayments([]);
      setInvoiceNotes('');
      setIsCheckoutOpen(false);
      setCustomerInfo({ name: '', phone: '' });
      setEditingItemId(null);
      setEditingItemType('catalog');
    } catch (error) {
      console.error('Failed to submit order to backend.', error);
      alert(error?.message || 'ثبت سفارش با خطا مواجه شد.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {!editingOrder && !staffMode && (
        <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center print-hide mb-6 rounded-2xl mx-auto border border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl border border-white/20">S</div>
                <div>
                    <h1 className="text-lg font-black tracking-tight">گلس دیزاین | Sitra</h1>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">سیستم یکپارچه سفارش آنلاین</p>
                </div>
            </div>
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                    <Menu size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute left-0 top-12 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-700">
                        <button onClick={() => { setIsMenuOpen(false); onGoToLogin(); }} className="w-full text-right px-4 py-3.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"><User size={14}/> ورود همکاران / پرسنل</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 text-slate-600">درباره ما</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 text-slate-600">تماس با ما</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 text-slate-600">قوانین و مقررات</button>
                    </div>
                )}
            </div>
        </header>
      )}

      {editingOrder && (
        <div className="bg-amber-100 border-2 border-amber-400 p-4 rounded-2xl flex justify-between items-center print-hide shadow-md">
           <div className="flex flex-col"><span className="font-black text-amber-900 text-lg">در حال ویرایش سفارش</span><span className="text-xs font-bold text-amber-700 mt-1">کد رهگیری: {editingOrder.orderCode} - مشتری: {editingOrder.customerName}</span></div>
           <button onClick={onCancelEdit} className="bg-white text-slate-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50">انصراف از ویرایش</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-hide">
        <div className="flex bg-slate-50 p-3 gap-3 border-b border-slate-200">
          {[{ id: 'single', label: 'تک جداره' }, { id: 'double', label: 'دوجداره' }, { id: 'laminate', label: 'لمینت' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-colors ${activeTab === t.id ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-100'}`}>{t.label}</button>
          ))}
        </div>
        <div className="p-6 flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full">
            {activeTab === 'single' && <div className="max-w-2xl mx-auto"><GlassRow layerKey="single.glass1" isUnavailable={Boolean(unavailableLayers['single.glass1'])} data={config.single} onChange={(f, v) => updateConfigLayer('single', f, null, v)} catalog={catalog} /></div>}
            {activeTab === 'laminate' && (
              <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner">
                <GlassRow layerKey="laminate.glass1" isUnavailable={Boolean(unavailableLayers['laminate.glass1'])} data={config.laminate.glass1} onChange={(f, v) => updateConfigLayer('laminate', 'glass1', f, v)} catalog={catalog} />
                <ConnectorRow type="interlayer" />
                <GlassRow layerKey="laminate.glass2" isUnavailable={Boolean(unavailableLayers['laminate.glass2'])} data={config.laminate.glass2} onChange={(f, v) => updateConfigLayer('laminate', 'glass2', f, v)} catalog={catalog} />
              </div>
            )}
            {activeTab === 'double' && (
              <div className="max-w-2xl mx-auto flex flex-col gap-1.5">
                <LaminatedPaneEditor assembly="double" paneKey="pane1" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
                <ConnectorRow type="spacer" value={config.double.spacerId} onChange={v => updateConfigLayer('double', 'spacerId', null, v)} catalog={catalog} />
                <LaminatedPaneEditor assembly="double" paneKey="pane2" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
              </div>
            )}
          </div>
          <div className="w-full lg:w-[320px] bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {['width', 'height', 'count'].map(field => (
                <div key={field} className="bg-white p-3 rounded-xl text-center border border-slate-200 shadow-sm focus-within:border-blue-400">
                  <span className="text-[10px] font-black text-slate-500 block mb-2">{field==='width'?'عرض(cm)':field==='height'?'ارتفاع(cm)':'تعداد'}</span>
                  <input type="number" name={field} value={dimensions[field]} onChange={handleDimensionChange} className="bg-transparent text-lg font-black outline-none text-center w-full tabular-nums" dir="ltr" />
                </div>
              ))}
            </div>
            
            {summaryErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-[10px] text-red-700 font-bold flex gap-2 items-start shadow-inner">
                 <ShieldAlert size={14} className="shrink-0 mt-0.5"/>
                 <ul className="list-disc list-inside">{summaryErrors.map((e,i)=><li key={i}>{e}</li>)}</ul>
              </div>
            )}

            <button onClick={() => setModalMode('settings')} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 border border-slate-200 bg-white shadow-sm hover:border-blue-400 transition-colors">
                <Settings size={16}/><span className="text-xs font-black">خدمات و الگو</span>
                {(Object.keys(config.operations || {}).length > 0 || config.pattern?.type !== 'none') && <span className="bg-amber-500 text-white text-[9px] px-1.5 rounded-full mr-2">ثبت شد</span>}
            </button>

            {isStaffContext && (
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={itemPricing.overrideUnitPrice} onChange={(e) => setItemPricing((p) => ({ ...p, overrideUnitPrice: e.target.value }))} placeholder="فی توافقی" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" dir="ltr" />
                  <input type="text" value={itemPricing.overrideReason} onChange={(e) => setItemPricing((p) => ({ ...p, overrideReason: e.target.value }))} placeholder="دلیل توافق" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={itemPricing.discountType} onChange={(e) => setItemPricing((p) => ({ ...p, discountType: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold">
                    <option value="none">بدون تخفیف</option>
                    <option value="percent">درصدی</option>
                    <option value="fixed">ثابت</option>
                  </select>
                  <input type="number" value={itemPricing.discountValue} onChange={(e) => setItemPricing((p) => ({ ...p, discountValue: e.target.value }))} placeholder="مقدار تخفیف" className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" dir="ltr" />
                </div>
                <div className={`text-[10px] font-bold ${catalogPricingPreview.isBelowFloor ? 'text-red-600' : 'text-slate-500'}`}>
                  کف مجاز: {toPN(catalogPricingPreview.floorUnitPrice.toLocaleString())} تومان
                </div>
              </div>
            )}

            <button onClick={handleAddToCart} disabled={!canAddCatalogItem} className={`w-full text-white rounded-xl font-black text-sm flex justify-between p-1.5 shadow-md mt-1 transition-all ${!canAddCatalogItem ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 active:scale-95 hover:bg-slate-800'}`}>
              <div className="bg-white/10 px-4 py-2.5 rounded-lg tabular-nums flex items-center gap-1.5 shadow-inner">
                  {catalogPricingPreview.finalLineTotal > 0 ? toPN(catalogPricingPreview.finalLineTotal.toLocaleString()) : '---'} <span className="text-[9px] font-normal opacity-80">تومان</span>
              </div>
              <div className="flex items-center gap-2 px-3">{editingItemId && editingItemType === 'catalog' ? 'بروزرسانی' : 'افزودن'} {editingItemId && editingItemType === 'catalog' ? <CheckCircle2 size={18}/> : <Plus size={18}/>}</div>
            </button>
          </div>
        </div>
      </div>

      {isStaffContext && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print-hide">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800">آیتم دستی فاکتور</h3>
              {editingItemId && editingItemType === 'manual' ? (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-[10px] font-black">در حال ویرایش</span>
              ) : null}
            </div>
            <div className="space-y-4">
              {editingItemId && editingItemType === 'manual' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 flex items-center justify-between gap-2">
                  <span>در حال ویرایش آیتم دستی</span>
                  <button onClick={cancelManualEdit} className="text-amber-800 underline">لغو ویرایش</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-black text-slate-600">عنوان</label>
                  <input
                    type="text"
                    value={manualDraft.title}
                    onChange={(e) => handleManualFieldChange('title', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                    placeholder="مثال: بسته‌بندی سفارشی"
                  />
                  {manualTouched.title && manualErrors.title && <div className="text-[10px] font-bold text-red-600">{manualErrors.title}</div>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">واحد</label>
                  <input
                    type="text"
                    value={manualDraft.unitLabel}
                    onChange={(e) => handleManualFieldChange('unitLabel', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                    placeholder="عدد"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">تعداد</label>
                  <input
                    type="number"
                    value={manualDraft.qty}
                    onChange={(e) => handleManualFieldChange('qty', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                    dir="ltr"
                  />
                  {manualTouched.qty && manualErrors.qty && <div className="text-[10px] font-bold text-red-600">{manualErrors.qty}</div>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">قیمت فی (تومان)</label>
                  <input
                    type="number"
                    value={manualDraft.unitPrice}
                    onChange={(e) => handleManualFieldChange('unitPrice', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                    dir="ltr"
                  />
                  {manualTouched.unitPrice && manualErrors.unitPrice && <div className="text-[10px] font-bold text-red-600">{manualErrors.unitPrice}</div>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">نوع تخفیف</label>
                  <select
                    value={manualDraft.discountType}
                    onChange={(e) => handleManualFieldChange('discountType', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                  >
                    <option value="none">بدون تخفیف</option>
                    <option value="percent">درصدی</option>
                    <option value="fixed">ثابت</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">مقدار تخفیف</label>
                  <input
                    type="number"
                    value={manualDraft.discountValue}
                    onChange={(e) => handleManualFieldChange('discountValue', e.target.value)}
                    disabled={manualDraft.discountType === 'none'}
                    className={`h-10 w-full border rounded-lg px-3 text-xs font-bold ${manualDraft.discountType === 'none' ? 'bg-slate-100 border-slate-100 text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                    dir="ltr"
                  />
                  {manualTouched.discountValue && manualErrors.discountValue && <div className="text-[10px] font-bold text-red-600">{manualErrors.discountValue}</div>}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-black text-slate-600">توضیحات آیتم</label>
                  <input
                    type="text"
                    value={manualDraft.description}
                    onChange={(e) => handleManualFieldChange('description', e.target.value)}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                    placeholder="اختیاری"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="h-10 flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3">
                  <input
                    type="checkbox"
                    checked={Boolean(manualDraft.taxable)}
                    onChange={(e) => handleManualFieldChange('taxable', e.target.checked)}
                  />
                  مشمول مالیات
                </label>
                <label className="h-10 flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3">
                  <input
                    type="checkbox"
                    checked={Boolean(manualDraft.productionImpact)}
                    onChange={(e) => handleManualFieldChange('productionImpact', e.target.checked)}
                  />
                  اثر روی تولید (نمایش در چاپ کارخانه)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">مبلغ پایه: {toPN(manualPreviewPricing.catalogLineTotal.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">تخفیف: {toPN(manualPreviewPricing.itemDiscountAmount.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900">مبلغ نهایی: {toPN(manualPreviewPricing.finalLineTotal.toLocaleString())}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAddManualItem}
                  disabled={!manualCanSubmit}
                  className={`h-10 px-4 rounded-lg text-xs font-black transition-colors ${manualCanSubmit ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {editingItemId && editingItemType === 'manual' ? 'بروزرسانی آیتم دستی' : 'افزودن آیتم دستی'}
                </button>
                {editingItemId && editingItemType === 'manual' && (
                  <button onClick={cancelManualEdit} className="h-10 px-4 rounded-lg text-xs font-black bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">لغو ویرایش</button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800">تنظیمات مالی فاکتور</h3>
              <span className="text-[10px] font-bold text-slate-500">پرداخت‌ها در مدیریت سفارشات ثبت می‌شود.</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">نوع تخفیف فاکتور</label>
                  <select
                    value={invoiceAdjustments.discountType}
                    onChange={(e) => setInvoiceAdjustments((p) => ({ ...p, discountType: e.target.value }))}
                    className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                  >
                    <option value="none">بدون تخفیف کل</option>
                    <option value="percent">تخفیف درصدی</option>
                    <option value="fixed">تخفیف ثابت</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">مقدار تخفیف کل</label>
                  <input
                    type="number"
                    value={invoiceAdjustments.discountValue}
                    onChange={(e) => setInvoiceAdjustments((p) => ({ ...p, discountValue: e.target.value }))}
                    disabled={invoiceAdjustments.discountType === 'none'}
                    className={`h-10 w-full border rounded-lg px-3 text-xs font-bold ${invoiceAdjustments.discountType === 'none' ? 'bg-slate-100 border-slate-100 text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                    dir="ltr"
                  />
                  <div className="text-[10px] font-bold text-slate-400">در حالت «بدون تخفیف»، این فیلد غیرفعال است.</div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">مالیات</label>
                  <label className="h-10 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={invoiceAdjustments.taxEnabled}
                      onChange={(e) => setInvoiceAdjustments((p) => ({ ...p, taxEnabled: e.target.checked }))}
                    />
                    اعمال مالیات
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600">نرخ مالیات (%)</label>
                  <input
                    type="number"
                    value={invoiceAdjustments.taxRate}
                    onChange={(e) => setInvoiceAdjustments((p) => ({ ...p, taxRate: e.target.value }))}
                    disabled={!invoiceAdjustments.taxEnabled}
                    className={`h-10 w-full border rounded-lg px-3 text-xs font-bold ${!invoiceAdjustments.taxEnabled ? 'bg-slate-100 border-slate-100 text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 block mb-1">یادداشت فاکتور</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="یادداشت داخلی یا توضیح برای مشتری"
                  className="w-full min-h-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">جمع قبل از تخفیف: {toPN(financials.subTotal.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">تخفیف سطری: {toPN(financials.itemDiscountTotal.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">تخفیف کل: {toPN(financials.invoiceDiscountAmount.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">مالیات: {toPN(financials.taxAmount.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900">جمع نهایی: {toPN(financials.grandTotal.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900">پرداخت‌شده: {toPN(financials.paidTotal.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-rose-700">مانده: {toPN(financials.dueAmount.toLocaleString())}</div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900">
                  وضعیت پرداخت:
                  <span className={`mr-2 inline-flex rounded px-2 py-0.5 ${paymentStatusMeta.className}`}>{paymentStatusMeta.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT BASKET */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4 print-hide">
        <div className="bg-slate-900 p-3 text-white flex justify-between items-center">
            <span className="text-sm font-black pl-2">سبد سفارش مشتری</span>
            <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all shadow-md">
              <Printer size={14}/> چاپ پیش‌فاکتور
            </button>
        </div>
        
        {orderItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold bg-slate-50/50">آیتمی در سفارش ثبت نشده است.</div>
        ) : (
            <>
              <div className="hidden lg:block overflow-x-auto p-2">
                  <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] border-y border-slate-200 rounded-lg">
                          <tr>
                              <th className="p-2 font-bold w-10 text-center border-l border-slate-200/50">ردیف</th>
                              <th className="p-2 font-bold w-32 border-l border-slate-200/50">نوع ساختار</th>
                              <th className="p-2 font-bold border-l border-slate-200/50">پیکربندی و خدمات</th>
                              <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">ابعاد (cm)</th>
                              <th className="p-2 font-bold w-12 text-center border-l border-slate-200/50">تعداد</th>
                              <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">فی (تومان)</th>
                              <th className="p-2 font-bold w-28 text-left border-l border-slate-200/50 pl-3">مبلغ کل</th>
                              <th className="p-2 font-bold w-16 text-center">عملیات</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {orderItems.map((item, i) => (
                              <tr key={item.id} className="hover:bg-blue-50/20 transition-colors even:bg-slate-50/50">
                                  <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 tabular-nums">{toPN(i+1)}</td>
                                  <td className="p-2 border-l border-slate-100">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black whitespace-nowrap shadow-sm border ${item.itemType === 'manual' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-700'}`}>{item.title}</span>
                                  </td>
                                  <td className="p-2 border-l border-slate-100"><StructureDetails item={item} catalog={catalog} /></td>
                                  <td className="p-2 text-center font-bold text-slate-600 border-l border-slate-100 tabular-nums" dir="ltr">{item.itemType === 'manual' ? '-' : `${toPN(item.dimensions.width)} × ${toPN(item.dimensions.height)}`}</td>
                                  <td className="p-2 text-center font-black text-slate-800 border-l border-slate-100 tabular-nums">{toPN(item.dimensions.count)}</td>
                                  <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-100 tabular-nums">{toPN(item.unitPrice.toLocaleString())}</td>
                                  <td className="p-2 text-left pl-3 font-black text-slate-900 border-l border-slate-100 tabular-nums bg-blue-50/30 text-sm">{toPN(item.totalPrice.toLocaleString())}</td>
                                  <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                          <button onClick={() => handleEditItemClick(item)} className="text-slate-400 hover:text-amber-600 bg-white border border-slate-200 p-1 rounded shadow-sm transition-colors"><Edit3 size={12}/></button>
                                          <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-600 bg-white border border-slate-200 p-1 rounded shadow-sm transition-colors"><Trash2 size={12}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                  {orderItems.map((item, i) => (
                      <div key={item.id} className="p-3 flex justify-between items-start hover:bg-slate-50 transition-colors">
                          <div className="flex gap-2 w-[75%]">
                              <span className="text-[10px] font-black text-slate-400 bg-slate-100 w-5 h-5 flex items-center justify-center rounded shrink-0 mt-0.5">{toPN(i+1)}</span>
                              <div>
                                  <div className="text-[11px] font-black text-slate-800 leading-tight">
                                      {item.title} <span className="text-[9px] text-slate-400 font-bold tracking-wider tabular-nums">({item.itemType === 'manual' ? 'آیتم دستی' : `${toPN(item.dimensions.width)}×${toPN(item.dimensions.height)}`} - {toPN(item.dimensions.count)}عدد)</span>
                                  </div>
                                  <div className="mt-1"><StructureDetails item={item} catalog={catalog} /></div>
                              </div>
                          </div>
                          <div className="flex flex-col items-end justify-between h-full gap-2">
                              <div className="font-black text-xs text-blue-600 shrink-0 tabular-nums">{toPN(item.totalPrice.toLocaleString())}</div>
                              <div className="flex gap-1.5 mt-1">
                                  <button onClick={() => handleEditItemClick(item)} className="text-slate-400 hover:text-amber-500 bg-white border border-slate-200 p-1 rounded shadow-sm"><Edit3 size={12}/></button>
                                  <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 bg-white border border-slate-200 p-1 rounded shadow-sm"><Trash2 size={12}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 gap-4">
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500">مبلغ نهایی فاکتور:</span>
                      <span className="text-lg lg:text-xl font-black text-slate-900 tabular-nums">{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-500">تومان</span></span>
                  </div>
                  
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                      <CheckCircle2 size={16}/> {editingOrder ? 'ثبت نهایی ویرایش سفارش' : 'تایید و ورود مشخصات'}
                  </button>
              </div>
            </>
        )}
      </div>

      {modalMode === 'settings' && (
        <SettingsModal 
            setModalMode={setModalMode} 
            config={config} 
            setConfig={setConfig} 
            catalog={catalog} 
        />
      )}

      {isCheckoutOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 print-hide">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-emerald-500 p-5 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><User size={32} /></div>
                      <h3 className="text-lg font-black">{editingOrder ? 'تایید نهایی ویرایش' : 'اطلاعات سفارش‌دهنده'}</h3>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><User size={14}/> نام و نام خانوادگی / شرکت</label>
                          <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-sm outline-none focus:border-emerald-400 transition-colors" placeholder="مثال: علی حسینی" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><Phone size={14}/> شماره موبایل</label>
                          <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-sm outline-none focus:border-emerald-400 transition-colors" placeholder="09123456789" dir="ltr" />
                      </div>
                      
                      <div className="pt-4 flex gap-3">
                          <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-colors">انصراف</button>
                          <button onClick={submitOrderToServer} className="flex-[2] bg-emerald-500 text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all">
                              <Save size={18}/> ثبت نهایی
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      <PrintInvoice 
        items={orderItems} 
        catalog={catalog} 
        grandTotal={grandTotal} 
        financials={financials}
        payments={payments}
        invoiceNotes={invoiceNotes}
        type="customer"
      />

    </div>
  );
};




