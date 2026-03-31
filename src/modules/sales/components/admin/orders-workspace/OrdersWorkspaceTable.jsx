import React from 'react';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Cog,
  Edit3,
  FileText,
  Link2,
  Printer,
  Trash2,
} from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { StructureDetails } from '@/components/shared/StructureDetails';
import { Badge, Button, Card } from '@/components/shared/ui';
import {
  deriveFinancialSummary,
  formatPersianDate,
  ORDER_STAGE_MAP,
  ORDER_STAGE_OPTIONS,
  paymentStatusPill,
  resolveOrderStageId,
  toSafeAmount,
} from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
import { isCustomSquareMeterUnit } from '@/utils/customItemUnits';
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
}) => (
  <Card className="print-hide overflow-hidden" padding="none">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-right text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="w-10 border-l border-slate-100 p-3 text-center font-black">ردیف</th>
            <th className="border-l border-slate-100 p-3 text-center font-black">کد رهگیری</th>
            <th className="border-l border-slate-100 p-3 font-black">نام مشتری</th>
            <th className="border-l border-slate-100 p-3 font-black">موبایل</th>
            <th className="border-l border-slate-100 p-3 text-center font-black">تاریخ ثبت</th>
            <th className="border-l border-slate-100 p-3 text-center font-black">مبلغ کل</th>
            <th className="border-l border-slate-100 p-3 text-center font-black">
              <Link2 size={12} className="mx-auto text-slate-400" />
            </th>
            <th className="border-l border-slate-100 p-3 text-center font-black">وضعیت مالی</th>
            <th className="border-l border-slate-100 p-3 text-center font-black">وضعیت سفارش</th>
            <th className="p-3 text-center font-black">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan="10" className="p-8 text-center font-bold text-slate-400">
                هیچ سفارشی یافت نشد.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order, index) => {
              const financialSummary = deriveFinancialSummary(order);
              const paymentPill = paymentStatusPill(financialSummary.status);
              const orderStageId = resolveOrderStageId(order);
              const orderStage = ORDER_STAGE_MAP[orderStageId] || ORDER_STAGE_MAP.registered;
              const hasCustomerLink = Boolean(order.customerId || order.projectId || order.projectContactId);

              return (
                <React.Fragment key={order.id}>
                  <tr className={`transition-colors hover:bg-slate-50 ${order.status === 'archived' ? 'opacity-50 grayscale' : ''} ${expandedOrderId === order.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="border-l border-slate-50 p-3 text-center font-bold tabular-nums text-slate-400">{toPN(index + 1)}</td>
                    <td className="border-l border-slate-50 p-3 text-center font-black tracking-wider text-blue-700 tabular-nums" dir="ltr">{toPN(order.orderCode)}</td>
                    <td className="border-l border-slate-50 p-3 font-black text-slate-800">
                      {order.customerName}
                      <span className="mr-1 text-[10px] font-normal text-slate-400">
                        ({toPN(Array.isArray(order.items) ? order.items.length : order.items)} قلم)
                      </span>
                    </td>
                    <td className="border-l border-slate-50 p-3 font-bold text-slate-600 tabular-nums" dir="ltr">{toPN(order.phone)}</td>
                    <td className="border-l border-slate-50 p-3 text-center font-bold text-slate-500">{formatPersianDate(order.date)}</td>
                    <td className="border-l border-slate-50 p-3 text-center font-black tabular-nums text-slate-900">{toPN(financialSummary.total.toLocaleString())}</td>
                    <td className="border-l border-slate-50 p-3 text-center">
                      <Link2
                        size={14}
                        className={`mx-auto ${hasCustomerLink ? 'text-emerald-600' : 'text-slate-300'}`}
                      />
                    </td>
                    <td className="border-l border-slate-50 p-3 text-center">
                      <Badge className={`rounded ${paymentPill.className}`} tone="neutral">{paymentPill.label}</Badge>
                    </td>
                    <td className="border-l border-slate-50 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {order.status === 'archived' ? (
                          <Badge>بایگانی‌شده</Badge>
                        ) : (
                          <select
                            value={orderStageId}
                            onChange={(event) => onUpdateOrderWorkflowStage(order, event.target.value)}
                            className={`focus-ring h-8 min-w-[130px] cursor-pointer appearance-none rounded-md px-2 py-1.5 text-center text-[10px] font-black outline-none ${orderStage.className}`}
                          >
                            {ORDER_STAGE_OPTIONS.map((stageOption) => (
                              <option key={stageOption.id} value={stageOption.id}>{stageOption.label}</option>
                            ))}
                          </select>
                        )}
                        <Button
                          onClick={() => onOpenPaymentManager(order)}
                          title="مدیریت پرداخت"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                        >
                          <Cog size={14} />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          onClick={() => onToggleOrderExpansion(order.id)}
                          size="icon"
                          variant={expandedOrderId === order.id ? 'primary' : 'secondary'}
                          title="مشاهده آیتم‌ها"
                          className="h-8 w-8"
                        >
                          {expandedOrderId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                        {order.status !== 'archived' ? (
                          <>
                            <Button onClick={() => onEditOrder(order)} size="icon" variant="secondary" className="h-8 w-8 text-amber-700">
                              <Edit3 size={14} />
                            </Button>
                            <Button onClick={() => onArchiveOrder(order)} size="icon" variant="secondary" className="h-8 w-8 text-rose-700">
                              <Archive size={14} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => onUpdateOrderWorkflowStage(order, 'registered')} size="sm" variant="success">بازیابی</Button>
                            <Button onClick={() => onDeleteArchivedOrder(order)} size="sm" variant="danger">
                              <Trash2 size={12} />
                              حذف
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedOrderId === order.id && (
                    <tr className="animate-in fade-in bg-slate-50/80">
                      <td colSpan="10" className="m-0 border-b-2 border-slate-200 p-0">
                        <div className="m-3 rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-sm font-black text-slate-800">ریز اقلام سفارش</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button onClick={() => onOpenPatternFilesModal(order)} size="sm" variant="secondary">
                                <FileText size={12} />
                                فایل‌های الگو
                              </Button>
                              <Button onClick={() => onPrintFactoryOrder(order)} size="sm" variant="primary">
                                <Printer size={12} />
                                چاپ نسخه کارگاهی
                              </Button>
                              <Button onClick={() => onPrintCustomerOrder(order)} size="sm" variant="secondary">
                                <Printer size={12} />
                                چاپ نسخه مشتری
                              </Button>
                            </div>
                          </div>

                          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-black text-slate-700">کل فاکتور: {toPN(financialSummary.total.toLocaleString())}</div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-black text-slate-700">پرداخت‌شده: {toPN(financialSummary.paid.toLocaleString())}</div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-black text-rose-700">مانده: {toPN(financialSummary.due.toLocaleString())}</div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-black text-slate-700">وضعیت مالی: {paymentPill.label}</div>
                          </div>

                          <table className="mt-2 w-full border-collapse text-right text-sm">
                            <thead className="rounded-lg border-y border-slate-200 bg-slate-50 text-xs text-slate-500">
                              <tr>
                                <th className="w-12 border-l border-slate-200/50 p-2 text-center font-bold">ردیف</th>
                                <th className="w-36 border-l border-slate-200/50 p-2 font-bold">نوع ساختار</th>
                                <th className="border-l border-slate-200/50 p-2 font-bold">پیکربندی و خدمات</th>
                                <th className="w-24 border-l border-slate-200/50 p-2 text-center font-bold">ابعاد (cm)</th>
                                <th className="w-16 border-l border-slate-200/50 p-2 text-center font-bold">تعداد</th>
                                <th className="w-28 border-l border-slate-200/50 p-2 text-center font-bold">فی (مترمربع)</th>
                                <th className="w-32 p-2 pl-4 text-left font-bold">مبلغ کل (تومان)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {Array.isArray(order.items) && order.items.map((item, itemIndex) => {
                                const itemType = String(item?.itemType || 'catalog');
                                const isManualLike = itemType === 'manual';
                                const widthText = isManualLike ? '-' : `${toPN(item?.dimensions?.width)} × ${toPN(item?.dimensions?.height)}`;
                                const countText = itemType === 'manual' ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1);
                                const perSquareMeterPrice = resolvePerSquareMeterPrice(item, catalog?.roundStep);
                                return (
                                  <tr key={item.id || `${itemIndex}`} className="even:bg-slate-50/50 hover:bg-blue-50/20">
                                    <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-400">{toPN(itemIndex + 1)}</td>
                                    <td className="border-l border-slate-100 p-2">
                                      <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[9px] font-black shadow-sm ${isManualLike ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>{item.title}</span>
                                    </td>
                                    <td className="border-l border-slate-100 p-2"><StructureDetails item={item} catalog={catalog} /></td>
                                    <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-600" dir="ltr">{widthText}</td>
                                    <td className="p-2 text-center font-black tabular-nums text-slate-800">{toPN(countText)}</td>
                                    <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-500">
                                      {perSquareMeterPrice === null ? '-' : toPN(perSquareMeterPrice.toLocaleString())}
                                    </td>
                                    <td className="bg-blue-50/30 p-2 pl-4 text-left text-[13px] font-black tabular-nums text-slate-900">{toPN(toSafeAmount(item?.totalPrice).toLocaleString())}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </Card>
);
