import React from 'react';
import { Archive, CreditCard, FileText, Link2 } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableDetail,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  IconButton,
  SelectPill,
} from '@/components/shared/ui';
import { toPN } from '@/utils/helpers';
import {
  deriveFinancialSummary,
  formatPersianDate,
  ORDER_STAGE_MAP,
  ORDER_STAGE_OPTIONS,
  paymentStatusPill,
  resolveOrderStageId,
} from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
import { OrdersWorkspaceItemsTable } from '@/modules/sales/components/admin/orders-workspace/OrdersWorkspaceItemsTable';

const ORDER_STAGE_SELECT_OPTIONS = ORDER_STAGE_OPTIONS.map((stageOption) => ({
  value: stageOption.id,
  label: stageOption.label,
}));

const FinancialBadge = ({ label, value, tone = 'neutral' }) => (
  <Badge tone={tone}>
    {label}: {toPN(value.toLocaleString())}
  </Badge>
);

export const OrdersWorkspaceTable = ({
  filteredOrders,
  expandedOrderId,
  onToggleOrderExpansion,
  onOpenPaymentManager,
  onUpdateOrderWorkflowStage,
  onEditOrder,
  onArchiveOrder,
  onDeleteArchivedOrder,
  onOpenPatternFilesModal,
  onPrintFactoryOrder,
  onPrintCustomerOrder,
  catalog,
  footer = null,
}) => (
  <DataTable className="print-hide" minWidthClass="min-w-[1120px] text-[13px]" footer={footer}>
    <DataTableHead>
      <tr>
        <DataTableHeaderCell className="w-12 text-[12px]" align="center">
          ردیف
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          کد رهگیری
        </DataTableHeaderCell>
        <DataTableHeaderCell className="text-[12px]">نام مشتری</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          موبایل
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          تاریخ ثبت
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          مبلغ کل
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          وضعیت مالی
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          وضعیت سفارش
        </DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">
          عملیات
        </DataTableHeaderCell>
      </tr>
    </DataTableHead>

    <DataTableBody>
      {filteredOrders.length === 0 ? (
        <DataTableState
          colSpan={9}
          title="هیچ سفارشی یافت نشد."
          description="فیلترها را تغییر دهید یا سفارش جدیدی ثبت کنید."
        />
      ) : (
        filteredOrders.map((order, index) => {
          const financialSummary = deriveFinancialSummary(order);
          const paymentPill = paymentStatusPill(financialSummary.status);
          const orderStageId = resolveOrderStageId(order);
          const orderStage = ORDER_STAGE_MAP[orderStageId] || ORDER_STAGE_MAP.registered;
          const hasCustomerLink = Boolean(order.customerId || order.projectId || order.projectContactId);

          return (
            <React.Fragment key={order.id}>
              <DataTableRow
                selected={expandedOrderId === order.id}
                tone={order.status === 'archived' ? 'muted' : 'default'}
                className={order.status === 'archived' ? 'opacity-75' : ''}
              >
                <DataTableCell align="center">{toPN(index + 1)}</DataTableCell>
                <DataTableCell
                  align="center"
                  tone="emphasis"
                  className="font-semibold tracking-wider !text-[rgb(28,63,138)]"
                  dir="ltr"
                >
                  {toPN(order.orderCode)}
                </DataTableCell>
                <DataTableCell tone="emphasis" className="text-[12px] text-[rgb(var(--ui-text))]">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{order.customerName}</span>
                    <Link2
                      size={13}
                      className={`shrink-0 ${hasCustomerLink ? 'text-[rgb(var(--ui-accent))]' : 'text-slate-300'}`}
                    />
                  </div>
                  <span className="mr-1 text-[9px] font-medium text-[rgb(var(--ui-text-muted))]">
                    ({toPN(Array.isArray(order.items) ? order.items.length : order.items)} قلم)
                  </span>
                </DataTableCell>
                <DataTableCell align="center">
                  <span
                    className="inline-flex justify-center text-center font-semibold text-[rgb(var(--ui-text-muted))]"
                    dir="ltr"
                  >
                    {toPN(order.phone)}
                  </span>
                </DataTableCell>
                <DataTableCell align="center">
                  <span
                    className="inline-flex justify-center text-center font-semibold text-[rgb(var(--ui-text-muted))]"
                    dir="ltr"
                  >
                    {formatPersianDate(order.date)}
                  </span>
                </DataTableCell>
                <DataTableCell align="center" tone="emphasis">
                  {toPN(financialSummary.total.toLocaleString())}
                </DataTableCell>
                <DataTableCell align="center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Badge className={`rounded-full ${paymentPill.className}`} tone="neutral">
                      {paymentPill.label}
                    </Badge>
                    <IconButton
                      size="iconSm"
                      surface="table"
                      label="مدیریت پرداخت"
                      tooltip="مدیریت پرداخت"
                      onClick={() => onOpenPaymentManager(order)}
                    >
                      <CreditCard size={14} />
                    </IconButton>
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <div className="flex items-center justify-center gap-1.5">
                    {order.status === 'archived' ? (
                      <Badge tone="neutral">بایگانی‌شده</Badge>
                    ) : (
                      <SelectPill
                        size="sm"
                        value={orderStageId}
                        options={ORDER_STAGE_SELECT_OPTIONS}
                        onChange={(event) => onUpdateOrderWorkflowStage(order, event.target.value)}
                        getDisplayProps={() => ({
                          label: orderStage.label,
                          className: orderStage.className,
                        })}
                      />
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton
                      action="rowExpand"
                      size="iconSm"
                      surface="table"
                      selected={expandedOrderId === order.id}
                      label="نمایش آیتم‌ها"
                      tooltip={expandedOrderId === order.id ? 'بستن جزئیات' : 'نمایش آیتم‌ها'}
                      onClick={() => onToggleOrderExpansion(order.id)}
                    />
                    {order.status !== 'archived' ? (
                      <>
                        <IconButton
                          action="edit"
                          size="iconSm"
                          surface="table"
                          label="ویرایش سفارش"
                          tooltip="ویرایش سفارش"
                          onClick={() => onEditOrder(order)}
                        />
                        <IconButton
                          action="archive"
                          size="iconSm"
                          surface="table"
                          label="بایگانی سفارش"
                          tooltip="بایگانی سفارش"
                          onClick={() => onArchiveOrder(order)}
                        >
                          <Archive size={13} />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Button
                          action="restore"
                          showActionIcon
                          size="sm"
                          surface="table"
                          onClick={() => onUpdateOrderWorkflowStage(order, 'registered')}
                        >
                          بازیابی
                        </Button>
                        <Button
                          action="delete"
                          showActionIcon
                          size="sm"
                          surface="table"
                          onClick={() => onDeleteArchivedOrder(order)}
                        >
                          حذف
                        </Button>
                      </>
                    )}
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>

              {expandedOrderId === order.id ? (
                <DataTableDetail
                  colSpan={9}
                  title="ریز اقلام سفارش"
                  description="جزئیات ساختار، خدمات و فایل‌های سفارش در این بخش متمرکز شده است."
                  actions={(
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onOpenPatternFilesModal(order)} leadingIcon={FileText}>
                        فایل‌های الگو
                      </Button>
                      <Button action="print" showActionIcon size="sm" onClick={() => onPrintFactoryOrder(order)}>
                        چاپ نسخه کارگاهی
                      </Button>
                      <Button
                        action="print"
                        showActionIcon
                        size="sm"
                        variant="secondary"
                        onClick={() => onPrintCustomerOrder(order)}
                      >
                        چاپ نسخه مشتری
                      </Button>
                    </div>
                  )}
                  summary={(
                    <>
                      <FinancialBadge label="کل فاکتور" value={financialSummary.total} tone="accent" />
                      <FinancialBadge label="پرداخت‌شده" value={financialSummary.paid} tone="neutral" />
                      <FinancialBadge label="مانده" value={financialSummary.due} tone="danger" />
                      <Badge className={`rounded-full ${paymentPill.className}`} tone="neutral">
                        وضعیت مالی: {paymentPill.label}
                      </Badge>
                    </>
                  )}
                >
                  <OrdersWorkspaceItemsTable items={order.items} catalog={catalog} />
                </DataTableDetail>
              ) : null}
            </React.Fragment>
          );
        })
      )}
    </DataTableBody>
  </DataTable>
);
