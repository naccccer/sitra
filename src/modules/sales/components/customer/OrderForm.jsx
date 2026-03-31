import React, { useState } from 'react';
import { Menu, Phone, User } from 'lucide-react';
import { Button, StatusBanner, WorkspaceCard } from '@/components/shared/ui';
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
      {!editingOrder && !staffMode ? (
        <WorkspaceCard className="print-hide" surface="accent" padding="md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="surface-icon-chip h-11 w-11 text-lg font-black text-[rgb(var(--ui-primary))]">S</div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-[rgb(var(--ui-text))]">گلس دیزاین | Sitra</h1>
                <p className="mt-0.5 text-[10px] font-bold text-[rgb(var(--ui-text-muted))]">سیستم یکپارچه سفارش آنلاین</p>
              </div>
            </div>
            <div className="relative">
              <Button onClick={() => setIsMenuOpen((previous) => !previous)} variant="secondary" size="icon" iconOnly title="منوی بیشتر">
                <Menu size={18} />
              </Button>
              {isMenuOpen ? (
                <div className="absolute left-0 top-12 z-50 w-52 overflow-hidden rounded-[var(--radius-xl)] border border-[rgba(var(--ui-border),0.92)] bg-[rgba(var(--ui-surface-elevated),0.98)] text-[rgb(var(--ui-text))] shadow-ui-raised">
                  <button onClick={() => { setIsMenuOpen(false); onGoToLogin(); }} className="flex w-full items-center gap-2 border-b border-[rgba(var(--ui-border),0.72)] px-4 py-3.5 text-right text-xs font-bold hover:bg-[rgba(var(--ui-surface-muted),0.7)]">
                    <User size={14} />
                    ورود همکاران / پرسنل
                  </button>
                  <button className="w-full border-b border-[rgba(var(--ui-border),0.72)] px-4 py-3 text-right text-xs font-bold text-[rgb(var(--ui-text-muted))] hover:bg-[rgba(var(--ui-surface-muted),0.7)]">درباره ما</button>
                  <button className="w-full border-b border-[rgba(var(--ui-border),0.72)] px-4 py-3 text-right text-xs font-bold text-[rgb(var(--ui-text-muted))] hover:bg-[rgba(var(--ui-surface-muted),0.7)]">تماس با ما</button>
                  <button className="w-full px-4 py-3 text-right text-xs font-bold text-[rgb(var(--ui-text-muted))] hover:bg-[rgba(var(--ui-surface-muted),0.7)]">قوانین و مقررات</button>
                </div>
              ) : null}
            </div>
          </div>
        </WorkspaceCard>
      ) : null}

      {editingOrder ? (
        <div className="print-hide space-y-3">
          <StatusBanner
            tone="warning"
            title="در حال ویرایش سفارش"
            description={`کد رهگیری: ${editingOrder.orderCode} - مشتری: ${editingOrder.customerName}`}
            action={<Button variant="secondary" onClick={onCancelEdit}>انصراف از ویرایش</Button>}
          />

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">
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
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">
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
        </div>
      ) : null}

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

      {modalMode === 'settings' ? (
        <SettingsModal
          setModalMode={setModalMode}
          config={config}
          setConfig={setConfig}
          catalog={catalog}
          dimensions={dimensions}
        />
      ) : null}

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
