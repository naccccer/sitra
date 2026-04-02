import React from 'react';
import { X } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { Badge, Button, Card, SegmentedTabs } from '@/components/shared/ui';
import { PAYMENT_MANAGER_TABS } from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
import { OrdersPaymentFinancialPanel } from '@/modules/sales/components/admin/orders-workspace/OrdersPaymentFinancialPanel';
import { OrdersPaymentRecordsPanel } from '@/modules/sales/components/admin/orders-workspace/OrdersPaymentRecordsPanel';

export const OrdersPaymentManagerModal = ({
  order,
  payments,
  paymentDraft,
  paymentTouched,
  paymentAmountValid,
  invoiceDraft,
  financials,
  statusPill,
  submitLabel,
  submitDisabled,
  activeTab,
  onActiveTabChange,
  onClose,
  onSubmit,
  paymentEditDrafts,
  uploadingReceiptKey,
  defaultPaymentMethod,
  onDraftFieldChange,
  onDraftTouched,
  onInvoiceDraftChange,
  onAddPayment,
  onBeginEditPayment,
  onEditPaymentFieldChange,
  onCancelEditPayment,
  onSaveEditedPayment,
  onRemovePayment,
  onUploadDraftReceipt,
  onUploadEditedReceipt,
}) => {
  if (!order || !invoiceDraft || !financials) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 print-hide backdrop-blur-[6px] sm:p-6">
      <Card
        className="flex max-h-[90vh] w-full max-w-[74rem] flex-col overflow-hidden !rounded-[32px] border-white/70 bg-[rgb(var(--ui-surface))] shadow-[var(--shadow-overlay)]"
        padding="none"
        tone="glass"
      >
        <div className="flex items-start justify-between gap-4 rounded-t-[30px] border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.98),rgba(8,12,24,0.96))] px-4 py-3 text-white">
          <div className="min-w-0">
            <div className="section-kicker text-white/55">مدیریت پرداخت</div>
            <div className="mt-1 truncate text-sm font-black sm:text-base">سفارش {toPN(order.orderCode)}</div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="!rounded-[18px] text-white hover:bg-white/10 hover:text-white">
            <X size={16} />
          </Button>
        </div>

        <div className="space-y-3 overflow-y-auto rounded-b-[30px] bg-[linear-gradient(180deg,rgba(247,247,248,0.82),rgba(243,243,245,0.96))] p-3 sm:p-4">
          <div className="rounded-[26px] border border-white/80 bg-white/88 p-3 backdrop-blur-[18px]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="surface-card !rounded-[22px] px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-text-muted))]">کل فاکتور</div>
                <div className="mt-1 text-sm font-black text-[rgb(var(--ui-text))]">{toPN(financials.grandTotal.toLocaleString())}</div>
              </div>
              <div className="surface-card !rounded-[22px] px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-text-muted))]">پرداخت‌شده</div>
                <div className="mt-1 text-sm font-black text-[rgb(var(--ui-text))]">{toPN(financials.paidTotal.toLocaleString())}</div>
              </div>
              <div className="surface-card !rounded-[22px] px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-text-muted))]">مانده</div>
                <div className="mt-1 text-sm font-black text-[rgb(var(--ui-danger-text))]">{toPN(financials.dueAmount.toLocaleString())}</div>
              </div>
              <div className="surface-card !rounded-[22px] px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-text-muted))]">وضعیت مالی</div>
                <div className="mt-2">
                  <Badge className={`rounded-full ${statusPill.className}`} tone="neutral">{statusPill.label}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-[rgb(var(--ui-surface-muted))]/88 p-2 backdrop-blur-[16px]">
            <SegmentedTabs
              tabs={PAYMENT_MANAGER_TABS}
              activeId={activeTab}
              onChange={onActiveTabChange}
              className="w-full rounded-[20px] p-1"
              tabClassName="rounded-[16px]"
            />
          </div>

          <div className="space-y-3 rounded-[28px] border border-white/75 bg-white/58 p-2 sm:p-3">
            <OrdersPaymentFinancialPanel
              activeTab={activeTab}
              invoiceDraft={invoiceDraft}
              financials={financials}
              onDraftChange={onInvoiceDraftChange}
            />

            <OrdersPaymentRecordsPanel
              activeTab={activeTab}
              order={order}
              payments={payments}
              paymentDraft={paymentDraft}
              paymentTouched={paymentTouched}
              paymentAmountValid={paymentAmountValid}
              paymentEditDrafts={paymentEditDrafts}
              uploadingReceiptKey={uploadingReceiptKey}
              defaultPaymentMethod={defaultPaymentMethod}
              onDraftFieldChange={onDraftFieldChange}
              onDraftTouched={onDraftTouched}
              onAddPayment={onAddPayment}
              onBeginEdit={onBeginEditPayment}
              onEditFieldChange={onEditPaymentFieldChange}
              onCancelEdit={onCancelEditPayment}
              onSaveEdit={onSaveEditedPayment}
              onRemovePayment={onRemovePayment}
              onUploadDraftReceipt={onUploadDraftReceipt}
              onUploadEditedReceipt={onUploadEditedReceipt}
            />
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/90 px-3 py-3 backdrop-blur-[18px]">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">تغییرات را قبل از ثبت نهایی مرور کنید.</div>
              <div className="flex items-center gap-2">
                <Button onClick={onClose} variant="secondary" className="!rounded-[18px]">انصراف</Button>
                <Button onClick={onSubmit} disabled={submitDisabled} variant="primary" className="!rounded-[18px]">{submitLabel}</Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
