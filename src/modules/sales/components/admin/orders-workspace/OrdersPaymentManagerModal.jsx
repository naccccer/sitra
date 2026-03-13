import React from 'react';
import { X } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { Badge, Button, Card } from '@/components/shared/ui';
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 print-hide">
      <Card className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden shadow-2xl" padding="none">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
          <div className="text-sm font-black">مدیریت پرداخت - سفارش {toPN(order.orderCode)}</div>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><X size={16} /></Button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-slate-700">کل فاکتور: {toPN(financials.grandTotal.toLocaleString())}</div>
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-slate-700">پرداخت‌شده: {toPN(financials.paidTotal.toLocaleString())}</div>
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-rose-700">مانده: {toPN(financials.dueAmount.toLocaleString())}</div>
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-slate-700">
            وضعیت مالی:
            <Badge className={`mr-2 rounded px-1.5 py-0.5 ${statusPill.className}`} tone="neutral">{statusPill.label}</Badge>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white px-4 pt-3">
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 hide-scrollbar">
            {PAYMENT_MANAGER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onActiveTabChange(tab.id)}
                className={`focus-ring h-9 whitespace-nowrap rounded-md px-3 text-xs font-black transition-colors ${
                  activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
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

        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Button onClick={onClose} variant="secondary">انصراف</Button>
            <Button onClick={onSubmit} disabled={submitDisabled} variant="primary">{submitLabel}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
