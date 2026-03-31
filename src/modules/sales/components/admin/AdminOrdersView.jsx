import React from 'react';
import { PrintInvoice } from '@/components/shared/PrintInvoice';
import { Button } from '@/components/shared/ui';
import { PatternFilesModal } from '@/modules/sales/components/admin/PatternFilesModal';
import { OrdersPaymentManagerModal } from '@/modules/sales/components/admin/orders-workspace/OrdersPaymentManagerModal';
import { OrdersWorkspaceTable } from '@/modules/sales/components/admin/orders-workspace/OrdersWorkspaceTable';
import { OrdersWorkspaceToolbar } from '@/modules/sales/components/admin/orders-workspace/OrdersWorkspaceToolbar';
import { toSafeAmount } from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
import { useOrdersPaymentManager } from '@/modules/sales/components/admin/orders-workspace/useOrdersPaymentManager';
import { useOrdersWorkflowController } from '@/modules/sales/components/admin/orders-workspace/useOrdersWorkflowController';

export const AdminOrdersView = ({
  orders,
  hasMoreOrders,
  setOrders,
  onLoadMoreOrders,
  catalog,
  profile,
  onEditOrder,
}) => {
  const paymentManager = useOrdersPaymentManager({ orders, setOrders, catalog });
  const workflow = useOrdersWorkflowController({
    orders,
    setOrders,
    onLoadMoreOrders,
    onOrderDeleted: paymentManager.handleOrderDeleted,
  });

  const paymentOrderId = paymentManager.paymentManagerOrder?.id;

  return (
    <div className="animate-in slide-in-from-left-4 space-y-4">
      <OrdersWorkspaceToolbar
        activeOrdersTab={workflow.activeOrdersTab}
        onTabChange={workflow.setActiveOrdersTab}
        searchQuery={workflow.searchQuery}
        onSearchChange={workflow.setSearchQuery}
        tabCounts={workflow.tabCounts}
        resultCount={workflow.filteredOrders.length}
      />

      <OrdersWorkspaceTable
        filteredOrders={workflow.filteredOrders}
        expandedOrderId={workflow.expandedOrderId}
        onToggleOrderExpansion={workflow.toggleOrderExpansion}
        onOpenPaymentManager={paymentManager.openPaymentManager}
        onUpdateOrderWorkflowStage={workflow.updateOrderWorkflowStage}
        onEditOrder={onEditOrder}
        onArchiveOrder={workflow.handleArchiveOrder}
        onDeleteArchivedOrder={workflow.deleteArchivedOrder}
        onOpenPatternFilesModal={workflow.openPatternFilesModal}
        onPrintFactoryOrder={workflow.printFactoryOrder}
        onPrintCustomerOrder={workflow.printCustomerOrder}
        catalog={catalog}
      />

      {hasMoreOrders && (
        <div className="print-hide flex justify-center pb-4 pt-2">
          <Button
            onClick={workflow.handleLoadMoreOrders}
            disabled={workflow.isLoadingMore}
            variant="secondary"
            size="lg"
          >
            {workflow.isLoadingMore ? 'در حال بارگذاری...' : 'بارگذاری سفارش‌های بیشتر'}
          </Button>
        </div>
      )}

      <OrdersPaymentManagerModal
        order={paymentManager.paymentManagerOrder}
        payments={paymentManager.paymentManagerPayments}
        paymentDraft={paymentManager.paymentManagerPaymentDraft}
        paymentTouched={paymentManager.paymentManagerPaymentTouched}
        paymentAmountValid={paymentManager.paymentManagerPaymentAmountValid}
        invoiceDraft={paymentManager.paymentManagerInvoiceDraft}
        financials={paymentManager.paymentManagerFinancials}
        statusPill={paymentManager.paymentManagerStatusPill}
        submitLabel={paymentManager.paymentManagerSubmitLabel}
        submitDisabled={paymentManager.paymentManagerSubmitDisabled}
        activeTab={paymentManager.paymentManagerActiveTab}
        onActiveTabChange={paymentManager.setPaymentManagerActiveTab}
        onClose={paymentManager.closePaymentManager}
        onSubmit={paymentManager.handlePaymentManagerSubmit}
        paymentEditDrafts={paymentManager.paymentEditDrafts}
        uploadingReceiptKey={paymentManager.uploadingReceiptKey}
        defaultPaymentMethod={paymentManager.defaultPaymentMethod}
        onDraftFieldChange={(field, value) => {
          if (!paymentOrderId) return;
          paymentManager.updateOrderPaymentDraft(paymentOrderId, field, value);
        }}
        onDraftTouched={(touched) => {
          if (!paymentOrderId) return;
          paymentManager.markOrderPaymentTouched(paymentOrderId, touched);
        }}
        onInvoiceDraftChange={(field, value) => {
          if (!paymentOrderId) return;
          paymentManager.updateOrderInvoiceDraft(paymentOrderId, field, value);
        }}
        onAddPayment={() => {
          if (!paymentManager.paymentManagerOrder) return;
          paymentManager.addPaymentForOrder(paymentManager.paymentManagerOrder);
        }}
        onBeginEditPayment={(payment) => {
          if (!paymentOrderId) return;
          paymentManager.beginEditPayment(paymentOrderId, payment);
        }}
        onEditPaymentFieldChange={(paymentId, field, value) => {
          if (!paymentOrderId) return;
          paymentManager.updateEditPaymentField(paymentOrderId, paymentId, field, value);
        }}
        onCancelEditPayment={(paymentId) => {
          if (!paymentOrderId) return;
          paymentManager.cancelEditPayment(paymentOrderId, paymentId);
        }}
        onSaveEditedPayment={(paymentId) => {
          if (!paymentManager.paymentManagerOrder) return;
          paymentManager.saveEditedPayment(paymentManager.paymentManagerOrder, paymentId);
        }}
        onRemovePayment={(paymentId) => {
          if (!paymentManager.paymentManagerOrder) return;
          paymentManager.removePayment(paymentManager.paymentManagerOrder, paymentId);
        }}
        onUploadDraftReceipt={(file) => {
          if (!paymentOrderId) return;
          paymentManager.uploadDraftReceipt(paymentOrderId, file);
        }}
        onUploadEditedReceipt={(paymentId, file) => {
          if (!paymentOrderId) return;
          paymentManager.uploadEditedReceipt(paymentOrderId, paymentId, file);
        }}
      />

      {workflow.viewingOrder && (
        <PrintInvoice
          items={workflow.viewingOrder.items}
          catalog={catalog}
          profile={profile}
          customerName={workflow.viewingOrder.customerName}
          orderCode={workflow.viewingOrder.orderCode}
          date={workflow.viewingOrder.date}
          grandTotal={toSafeAmount(workflow.viewingOrder.total)}
          financials={workflow.viewingOrder.financials}
          payments={workflow.viewingOrder.payments}
          invoiceNotes={workflow.viewingOrder.invoiceNotes}
          type={workflow.viewingOrderType}
        />
      )}

      <PatternFilesModal
        isOpen={Boolean(workflow.patternFilesContext)}
        onClose={() => workflow.setPatternFilesContext(null)}
        orderCode={workflow.patternFilesContext?.orderCode}
        files={workflow.patternFilesContext?.files || []}
      />
    </div>
  );
};
