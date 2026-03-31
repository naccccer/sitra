import React, { useState } from 'react';
import { Menu, Phone, User } from 'lucide-react';
import { SettingsModal } from '@/modules/sales/components/customer/SettingsModal';
import { PrintInvoice } from '@/components/shared/PrintInvoice';
import { CheckoutModal } from '@/modules/sales/components/customer/order-form/CheckoutModal';
import { ManualItemModal } from '@/modules/sales/components/customer/order-form/ManualItemModal';
import { OrderConfigurationSection } from '@/modules/sales/components/customer/order-form/OrderConfigurationSection';
import { OrderItemsSection } from '@/modules/sales/components/customer/order-form/OrderItemsSection';
import { useOrderFormController } from '@/modules/sales/components/customer/order-form/useOrderFormController';

export const OrderForm = ({
  catalog,
  setOrders,
  profile,
  editingOrder = null,
  onCancelEdit,
  onGoToLogin,
  onGoToPricing,
  staffMode = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
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
    handleCustomerInfoChange,
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
    handleManualFieldChange,
    handleAddManualItem,
    cancelManualEdit,
    summaryErrors,
    unavailableLayers,
    catalogPricingPreview,
    customItems,
    customDraft,
    setCustomDraft,
    customDraftState,
    financials,
    grandTotal,
    canAddCatalogItem,
    handleAddToCart,
    handleEditItemClick,
    handleRemoveItem,
    submitOrderToServer,
  } = useOrderFormController({
    catalog,
    editingOrder,
    onCancelEdit,
    setOrders,
    staffMode,
  });

  const isEditingManualItem = Boolean(editingItemId && editingItemType === 'manual');
  const isEditingConfigItem = Boolean(editingItemId && editingItemType !== 'manual');

  return (
    <div className={`mx-auto max-w-6xl ${editingOrder ? 'space-y-3' : 'space-y-6'}`}>
      {!editingOrder && !staffMode && (
        <header className="print-hide mx-auto mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-black">S</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">گلس دیزاین | Sitra</h1>
              <p className="mt-0.5 text-[10px] font-bold text-slate-400">سیستم یکپارچه سفارش آنلاین</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen((previous) => !previous)} className="rounded-lg border border-slate-700 bg-slate-800 p-2 transition-colors hover:bg-slate-700">
              <Menu size={20} />
            </button>
            {isMenuOpen && (
              <div className="absolute left-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xl">
                <button onClick={() => { setIsMenuOpen(false); onGoToLogin(); }} className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3.5 text-right text-xs font-bold hover:bg-slate-50">
                  <User size={14} />
                  ورود همکاران / پرسنل
                </button>
                <button className="w-full border-b border-slate-100 px-4 py-3 text-right text-xs font-bold text-slate-600 hover:bg-slate-50">درباره ما</button>
                <button className="w-full border-b border-slate-100 px-4 py-3 text-right text-xs font-bold text-slate-600 hover:bg-slate-50">تماس با ما</button>
                <button className="w-full px-4 py-3 text-right text-xs font-bold text-slate-600 hover:bg-slate-50">قوانین و مقررات</button>
              </div>
            )}
          </div>
        </header>
      )}

      {editingOrder && (
        <section className="print-hide rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2.5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="text-sm font-black text-amber-900">در حال ویرایش سفارش</span>
              <span className="mt-0.5 block truncate text-[11px] font-bold text-amber-700">کد رهگیری: {editingOrder.orderCode} - مشتری: {editingOrder.customerName}</span>
            </div>
            <button
              onClick={onCancelEdit}
              className="w-full rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 lg:w-auto"
            >
              انصراف از ویرایش
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <User size={12} />
                نام و نام خانوادگی / شرکت
              </span>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(event) => handleCustomerInfoChange('name', event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black outline-none transition-colors focus:border-emerald-400"
                placeholder="مثال: علی حسینی"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Phone size={12} />
                شماره موبایل
              </span>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(event) => handleCustomerInfoChange('phone', event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black outline-none transition-colors focus:border-emerald-400"
                placeholder="09123456789"
                dir="ltr"
              />
            </label>
          </div>
        </section>
      )}

      <OrderConfigurationSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        updateConfigLayer={updateConfigLayer}
        catalog={catalog}
        unavailableLayers={unavailableLayers}
        dimensions={dimensions}
        onDimensionChange={handleDimensionChange}
        summaryErrors={summaryErrors}
        isStaffContext={isStaffContext}
        itemPricing={itemPricing}
        setItemPricing={setItemPricing}
        catalogPricingPreview={catalogPricingPreview}
        canAddCatalogItem={canAddCatalogItem}
        onAddCatalogItem={handleAddToCart}
        isEditingCatalogItem={isEditingConfigItem}
        onOpenSettingsModal={() => setModalMode('settings')}
        customItems={customItems}
        customDraft={customDraft}
        setCustomDraft={setCustomDraft}
        customDraftState={customDraftState}
        onGoToCustomItems={onGoToPricing}
      />

      <OrderItemsSection
        orderItems={orderItems}
        catalog={catalog}
        isStaffContext={isStaffContext}
        isEditingManualItem={isEditingManualItem}
        onOpenManualItemModal={() => setModalMode('manualItem')}
        onPrintInvoice={() => window.print()}
        onEditItem={handleEditItemClick}
        onRemoveItem={handleRemoveItem}
        grandTotal={grandTotal}
        editingOrder={editingOrder}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      {modalMode === 'settings' && (
        <SettingsModal
          setModalMode={setModalMode}
          config={config}
          setConfig={setConfig}
          catalog={catalog}
          dimensions={dimensions}
        />
      )}

      <ManualItemModal
        isOpen={isStaffContext && modalMode === 'manualItem'}
        manualDraft={manualDraft}
        manualTouched={manualTouched}
        manualErrors={manualErrors}
        manualPreviewPricing={manualPreviewPricing}
        manualCanSubmit={manualCanSubmit}
        isEditingManual={isEditingManualItem}
        onFieldChange={handleManualFieldChange}
        onSubmit={handleAddManualItem}
        onClose={() => setModalMode(null)}
        onCancelEdit={cancelManualEdit}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        isStaffContext={isStaffContext}
        editingOrder={editingOrder}
        customerInfo={customerInfo}
        customerLinks={customerLinks}
        onCustomerInfoChange={handleCustomerInfoChange}
        onClose={() => setIsCheckoutOpen(false)}
        onSubmit={submitOrderToServer}
      />

      <PrintInvoice
        items={orderItems}
        catalog={catalog}
        profile={profile}
        grandTotal={grandTotal}
        financials={financials}
        payments={payments}
        invoiceNotes={invoiceNotes}
        type="customer"
      />
    </div>
  );
};
