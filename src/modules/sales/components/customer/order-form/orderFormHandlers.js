import { salesApi } from '@/modules/sales/services/salesApi';
import { buildManualPricingMeta } from '@/modules/sales/domain/invoice';
import { createEmptyManualDraft, parseIntSafe } from '@/modules/sales/components/customer/order-form/orderFormUtils';

export const createOrderFormHandlers = ({
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
}) => {
  const resetManualEditor = () => {
    setEditingItemId(null);
    setEditingItemType('catalog');
    setManualTouched({});
    setManualDraft(createEmptyManualDraft());
  };

  const handleAddToCart = () => {
    if (!canAddCatalogItem) return;
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
      overrideUnitPrice: item?.pricingMeta?.overrideUnitPrice ?? '',
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
  };

  const handleManualFieldChange = (field, value) => {
    setManualDraft((previous) => ({ ...previous, [field]: value }));
    setManualTouched((previous) => ({ ...previous, [field]: true }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo((previous) => ({ ...previous, [field]: value }));
  };

  const submitOrderToServer = async () => {
    const trimmedName = customerInfo.name.trim();
    const trimmedPhone = customerInfo.phone.trim();
    if (!trimmedName) return alert('لطفاً نام و نام خانوادگی را وارد کنید.');
    if (trimmedName.length < 2) return alert('نام باید حداقل ۲ کاراکتر باشد.');
    if (!trimmedPhone) return alert('لطفاً شماره موبایل را وارد کنید.');
    if (!/^(09\d{9}|(\+98|0098)9\d{9})$/.test(trimmedPhone)) {
      return alert('شماره موبایل وارد شده معتبر نیست. مثال: 09123456789');
    }

    try {
      if (editingOrder) {
        const updatePayload = {
          id: Number(editingOrder.id),
          customerName: trimmedName,
          phone: trimmedPhone,
          date: editingOrder.date,
          total: grandTotal,
          status: editingOrder.status || 'pending',
          items: [...orderItems],
          financials,
          payments,
          invoiceNotes,
          expectedUpdatedAt: editingOrder?.updatedAt || null,
        };
        const response = await salesApi.updateOrder(updatePayload);
        const updatedOrder = response?.order ?? { ...editingOrder, ...updatePayload };
        setOrders((previous) => previous.map((order) => (order.id === editingOrder.id ? updatedOrder : order)));
        alert(response?.queued ? 'ویرایش سفارش در صف آفلاین ثبت شد و بعد از اتصال همگام‌سازی می‌شود.' : 'سفارش با موفقیت ویرایش شد.');
        onCancelEdit?.();
        return;
      }

      const createPayload = {
        customerName: trimmedName,
        phone: trimmedPhone,
        date: new Date().toLocaleDateString('fa-IR'),
        total: isStaffContext
          ? grandTotal
          : orderItems.reduce((accumulator, item) => accumulator + Math.max(0, parseIntSafe(item.totalPrice, 0)), 0),
        status: 'pending',
        items: [...orderItems],
      };
      if (isStaffContext) {
        createPayload.financials = financials;
        createPayload.payments = payments;
        createPayload.invoiceNotes = invoiceNotes;
      }

      const response = await salesApi.createOrder(createPayload);
      const createdOrder = response?.order ?? { id: Date.now(), ...createPayload, orderCode: '' };
      setOrders((previous) => [createdOrder, ...previous]);
      alert(response?.queued
        ? 'سفارش در صف آفلاین ذخیره شد و پس از اتصال به صورت خودکار ارسال می‌شود.'
        : `سفارش ثبت شد. کد پیگیری: ${createdOrder.orderCode || '-'}`);

      setOrderItems([]);
      setPayments([]);
      setInvoiceNotes('');
      setIsCheckoutOpen(false);
      setCustomerInfo({ name: '', phone: '' });
      setEditingItemId(null);
      setEditingItemType('catalog');
    } catch (error) {
      alert(error?.message || 'ثبت سفارش با خطا مواجه شد.');
    }
  };

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
