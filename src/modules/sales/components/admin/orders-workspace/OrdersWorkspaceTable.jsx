import React from 'react';
import { Archive, ChevronDown, CreditCard, FileText, Link2 } from 'lucide-react';
import { StructureDetails } from '@/components/shared/StructureDetails';
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
  Select,
} from '@/components/shared/ui';
import { toPN } from '@/utils/helpers';
import { isCustomSquareMeterUnit } from '@/utils/customItemUnits';
import {
  deriveFinancialSummary,
  formatPersianDate,
  ORDER_STAGE_MAP,
  ORDER_STAGE_OPTIONS,
  paymentStatusPill,
  resolveOrderStageId,
  toSafeAmount,
} from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';

const toPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const normalizeByRoundStep = (value, roundStep = 1000) => {
  const numeric = Math.max(0, Number(value) || 0);
  const stepNumeric = Number(roundStep);
  const step = Number.isFinite(stepNumeric) && stepNumeric > 0 ? stepNumeric : 1000;
  return Math.floor(numeric / step) * step;
};

const resolvePerSquareMeterPrice = (item = {}, roundStep = 1000) => {
  const itemType = String(item?.itemType || 'catalog');
  if (itemType === 'manual') return null;
  if (itemType === 'custom' && !isCustomSquareMeterUnit(item?.custom?.unitLabel || item?.config?.unitLabel)) return null;
  const piecePrice = toSafeAmount(item?.unitPrice);
  const widthCm = toPositiveNumber(item?.dimensions?.width);
  const heightCm = toPositiveNumber(item?.dimensions?.height);
  if (piecePrice <= 0 || widthCm <= 0 || heightCm <= 0) return normalizeByRoundStep(piecePrice, roundStep);
  const rawArea = (widthCm * heightCm) / 10000;
  const effectiveArea = Math.max(0.25, rawArea);
  if (effectiveArea <= 0) return normalizeByRoundStep(piecePrice, roundStep);
  return normalizeByRoundStep(piecePrice / effectiveArea, roundStep);
};

const FinancialBadge = ({ label, value, tone = 'neutral' }) => (
  <Badge tone={tone}>{label}: {toPN(value.toLocaleString())}</Badge>
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
        <DataTableHeaderCell className="w-12 text-[12px]" align="center">ردیف</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">کد رهگیری</DataTableHeaderCell>
        <DataTableHeaderCell className="text-[12px]">نام مشتری</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">موبایل</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">تاریخ ثبت</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">مبلغ کل</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">وضعیت مالی</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">وضعیت سفارش</DataTableHeaderCell>
        <DataTableHeaderCell align="center" className="text-[12px]">عملیات</DataTableHeaderCell>
      </tr>
    </DataTableHead>

    <DataTableBody>
      {filteredOrders.length === 0 ? (
        <DataTableState colSpan={9} title="هیچ سفارشی یافت نشد." description="فیلترها را تغییر دهید یا سفارش جدیدی ثبت کنید." />
      ) : (
        filteredOrders.map((order, index) => {
          const financialSummary = deriveFinancialSummary(order);
          const paymentPill = paymentStatusPill(financialSummary.status);
          const orderStageId = resolveOrderStageId(order);
          const orderStage = ORDER_STAGE_MAP[orderStageId] || ORDER_STAGE_MAP.registered;
          const hasCustomerLink = Boolean(order.customerId || order.projectId || order.projectContactId);

          return (
            <React.Fragment key={order.id}>
              <DataTableRow selected={expandedOrderId === order.id} tone={order.status === 'archived' ? 'muted' : 'default'} className={order.status === 'archived' ? 'opacity-75' : ''}>
                <DataTableCell align="center">{toPN(index + 1)}</DataTableCell>
                <DataTableCell align="center" tone="emphasis" className="tracking-wider text-[rgb(10,22,52)]" dir="ltr">{toPN(order.orderCode)}</DataTableCell>
                <DataTableCell tone="emphasis" className="text-[12px] text-[rgb(var(--ui-text))]">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{order.customerName}</span>
                    <Link2 size={13} className={`shrink-0 ${hasCustomerLink ? 'text-[rgb(var(--ui-accent))]' : 'text-slate-300'}`} />
                  </div>
                  <span className="mr-1 text-[9px] font-medium text-[rgb(var(--ui-text-muted))]">
                    ({toPN(Array.isArray(order.items) ? order.items.length : order.items)} قلم)
                  </span>
                  </DataTableCell>
                <DataTableCell align="center">
                  <span className="inline-flex justify-center text-center font-semibold text-[rgb(var(--ui-text-muted))]" dir="ltr">{toPN(order.phone)}</span>
                </DataTableCell>
                <DataTableCell align="center">
                  <span className="inline-flex justify-center text-center font-semibold text-[rgb(var(--ui-text-muted))]" dir="ltr">{formatPersianDate(order.date)}</span>
                </DataTableCell>
                <DataTableCell align="center" tone="emphasis">{toPN(financialSummary.total.toLocaleString())}</DataTableCell>
                <DataTableCell align="center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Badge className={`rounded-full ${paymentPill.className}`} tone="neutral">{paymentPill.label}</Badge>
                    <IconButton size="iconSm" variant="secondary" label="مدیریت پرداخت" tooltip="مدیریت پرداخت" className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white" onClick={() => onOpenPaymentManager(order)}>
                      <CreditCard size={14} />
                    </IconButton>
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <div className="flex items-center justify-center gap-1.5">
                    {order.status === 'archived' ? (
                        <Badge tone="neutral">بایگانی‌شده</Badge>
                      ) : (
                        <div className="relative min-w-[104px]">
                          <div className={`pointer-events-none grid h-9 grid-cols-[18px_minmax(0,1fr)_18px] items-center rounded-[var(--radius-md)] border border-[rgb(var(--ui-border-soft))] bg-white px-2 text-[10px] font-semibold shadow-[0_6px_16px_rgba(18,33,74,0.08)] ${orderStage.className}`}>
                            <ChevronDown size={14} className="justify-self-start text-[rgb(var(--ui-primary))]" />
                            <span className="block text-center">{orderStage.label}</span>
                            <span aria-hidden="true" />
                          </div>
                          <Select
                            size="sm"
                            value={orderStageId}
                            onChange={(event) => onUpdateOrderWorkflowStage(order, event.target.value)}
                            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                          >
                            {ORDER_STAGE_OPTIONS.map((stageOption) => <option key={stageOption.id} value={stageOption.id}>{stageOption.label}</option>)}
                          </Select>
                        </div>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <DataTableActions>
                    <IconButton
                      action="rowExpand"
                      size="iconSm"
                      variant={expandedOrderId === order.id ? 'primary' : 'secondary'}
                      label="نمایش آیتم‌ها"
                      tooltip={expandedOrderId === order.id ? 'بستن جزئیات' : 'نمایش آیتم‌ها'}
                      className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white"
                      onClick={() => onToggleOrderExpansion(order.id)}
                    />
                    {order.status !== 'archived' ? (
                      <>
                        <IconButton action="edit" size="iconSm" label="ویرایش سفارش" tooltip="ویرایش سفارش" className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white" onClick={() => onEditOrder(order)} />
                        <IconButton action="archive" size="iconSm" variant="secondary" label="بایگانی سفارش" tooltip="بایگانی سفارش" className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white" onClick={() => onArchiveOrder(order)}>
                          <Archive size={13} />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Button action="restore" showActionIcon size="sm" className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white" onClick={() => onUpdateOrderWorkflowStage(order, 'registered')}>بازیابی</Button>
                        <Button action="delete" showActionIcon size="sm" className="!border-white/70 !bg-white !text-[rgb(var(--ui-primary))] !shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:!bg-white" onClick={() => onDeleteArchivedOrder(order)}>حذف</Button>
                      </>
                    )}
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>

              {expandedOrderId === order.id && (
                <DataTableDetail
                  colSpan={9}
                  title="ریز اقلام سفارش"
                  description="جزئیات ساختار، خدمات و فایل‌های سفارش در این بخش متمرکز شده است."
                  actions={(
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onOpenPatternFilesModal(order)} leadingIcon={FileText}>فایل‌های الگو</Button>
                      <Button action="print" showActionIcon size="sm" onClick={() => onPrintFactoryOrder(order)}>چاپ نسخه کارگاهی</Button>
                      <Button action="print" showActionIcon size="sm" variant="secondary" onClick={() => onPrintCustomerOrder(order)}>چاپ نسخه مشتری</Button>
                    </div>
                  )}
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    <FinancialBadge label="کل فاکتور" value={financialSummary.total} tone="accent" />
                    <FinancialBadge label="پرداخت‌شده" value={financialSummary.paid} tone="neutral" />
                    <FinancialBadge label="مانده" value={financialSummary.due} tone="danger" />
                    <Badge className={`rounded-full ${paymentPill.className}`} tone="neutral">وضعیت مالی: {paymentPill.label}</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-right text-sm">
                      <thead className="border-b border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))] text-[10px] font-bold text-[rgb(var(--ui-text-muted))]">
                        <tr>
                          <th className="px-2 py-2 text-center">ردیف</th>
                          <th className="px-2 py-2">نوع ساختار</th>
                          <th className="px-2 py-2">پیکربندی و خدمات</th>
                          <th className="px-2 py-2 text-center">ابعاد (cm)</th>
                          <th className="px-2 py-2 text-center">تعداد</th>
                          <th className="px-2 py-2 text-center">فی (مترمربع)</th>
                          <th className="px-2 py-2 text-left">مبلغ کل (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--ui-border-soft))]">
                        {Array.isArray(order.items) && order.items.map((item, itemIndex) => {
                          const itemType = String(item?.itemType || 'catalog');
                          const isManualLike = itemType === 'manual';
                          const widthText = isManualLike ? '-' : `${toPN(item?.dimensions?.width)} × ${toPN(item?.dimensions?.height)}`;
                          const countText = itemType === 'manual' ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1);
                          const perSquareMeterPrice = resolvePerSquareMeterPrice(item, catalog?.roundStep);

                          return (
                            <tr key={item.id || `${itemIndex}`} className="transition-colors even:bg-[rgb(var(--ui-surface-muted))]/38 hover:bg-[rgb(var(--ui-accent-muted))]/26">
                              <td className="px-2 py-2 text-center font-bold text-[rgb(var(--ui-text-muted))]">{toPN(itemIndex + 1)}</td>
                              <td className="px-2 py-2">
                                <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[9px] font-semibold shadow-[var(--shadow-soft)] ${isManualLike ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]' : 'border-[rgb(var(--ui-border))] bg-white text-[rgb(var(--ui-text))]'}`}>{item.title}</span>
                              </td>
                              <td className="px-2 py-2"><StructureDetails item={item} catalog={catalog} /></td>
                              <td className="px-2 py-2 text-center font-medium text-[rgb(var(--ui-text-muted))]" dir="ltr">{widthText}</td>
                              <td className="px-2 py-2 text-center font-semibold text-[rgb(var(--ui-text))]">{toPN(countText)}</td>
                              <td className="px-2 py-2 text-center font-medium text-[rgb(var(--ui-text-muted))]">
                                {perSquareMeterPrice === null ? '-' : toPN(perSquareMeterPrice.toLocaleString())}
                              </td>
                              <td className="bg-[rgb(var(--ui-accent-muted))]/32 px-2 py-2 text-left font-semibold text-[rgb(var(--ui-text))]">{toPN(toSafeAmount(item?.totalPrice).toLocaleString())}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </DataTableDetail>
              )}
            </React.Fragment>
          );
        })
      )}
    </DataTableBody>
  </DataTable>
);
