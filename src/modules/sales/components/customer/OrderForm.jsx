import React, { useState } from 'react';
import { Menu, User } from 'lucide-react';
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
  const isEditingCatalogItem = Boolean(editingItemId && editingItemType === 'catalog');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
        <div className="print-hide flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-100 p-4 shadow-md">
          <div className="flex flex-col">
            <span className="text-lg font-black text-amber-900">در حال ویرایش سفارش</span>
            <span className="mt-1 text-xs font-bold text-amber-700">کد رهگیری: {editingOrder.orderCode} - مشتری: {editingOrder.customerName}</span>
          </div>
          <button onClick={onCancelEdit} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">انصراف از ویرایش</button>
        </div>
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
        isEditingCatalogItem={isEditingCatalogItem}
        onOpenSettingsModal={() => setModalMode('settings')}
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
        editingOrder={editingOrder}
        customerInfo={customerInfo}
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
