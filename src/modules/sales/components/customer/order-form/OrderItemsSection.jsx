import React from 'react';
import { CheckCircle2, Edit3, Plus, Printer, Trash2 } from 'lucide-react';
import { isCustomSquareMeterUnit } from '@/utils/customItemUnits';
import { toPN } from '@/utils/helpers';
import { StructureDetails } from '@/components/shared/StructureDetails';
import { Button, EmptyState, TableShell, WorkspaceCard } from '@/components/shared/ui';

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

const isManualLike = (item = {}) => String(item?.itemType || 'catalog') === 'manual';

const resolvePerSquareMeterPrice = (item = {}, roundStep = 1000) => {
  const itemType = String(item?.itemType || 'catalog');
  if (itemType === 'manual') return null;
  if (itemType === 'custom' && !isCustomSquareMeterUnit(item?.custom?.unitLabel || item?.config?.unitLabel)) return null;

  const piecePrice = Math.max(0, Number(item?.unitPrice) || 0);
  const widthCm = toPositiveNumber(item?.dimensions?.width);
  const heightCm = toPositiveNumber(item?.dimensions?.height);
  if (piecePrice <= 0 || widthCm <= 0 || heightCm <= 0) return normalizeByRoundStep(piecePrice, roundStep);

  const rawArea = (widthCm * heightCm) / 10000;
  const effectiveArea = Math.max(0.25, rawArea);
  if (effectiveArea <= 0) return normalizeByRoundStep(piecePrice, roundStep);

  return normalizeByRoundStep(piecePrice / effectiveArea, roundStep);
};

const mobileTypeLabel = (item = {}) => {
  if (item?.itemType === 'manual') return 'آیتم دستی';
  if (item?.itemType === 'custom') return 'آیتم سفارشی';
  return `${toPN(item?.dimensions?.width)}×${toPN(item?.dimensions?.height)}`;
};

export const OrderItemsSection = ({
  orderItems,
  catalog,
  isStaffContext,
  isEditingManualItem,
  onOpenManualItemModal,
  onPrintInvoice,
  onEditItem,
  onRemoveItem,
  grandTotal,
  editingOrder,
  onOpenCheckout,
}) => (
  <WorkspaceCard
    className="print-hide mb-4"
    title="سبد سفارش مشتری"
    description="مرور اقلام انتخاب‌شده، چاپ پیش‌فاکتور و نهایی‌سازی ثبت سفارش."
    actions={(
      <div className="flex items-center gap-2">
        {isStaffContext ? (
          <Button onClick={onOpenManualItemModal} variant="secondary" size="sm">
            <Plus size={14} />
            آیتم دستی
            {isEditingManualItem ? <span className="rounded-full bg-[rgb(var(--ui-warning))] px-1.5 text-[9px] text-white">در حال ویرایش</span> : null}
          </Button>
        ) : null}
        <Button onClick={onPrintInvoice} variant="primary" size="sm">
          <Printer size={14} />
          چاپ پیش‌فاکتور
        </Button>
      </div>
    )}
    padding="none"
    bodyClassName="!p-0"
  >
    {orderItems.length === 0 ? (
      <div className="p-4">
        <EmptyState
          title="آیتمی در سفارش ثبت نشده است"
          description="پس از افزودن آیتم‌ها، جزئیات سفارش و مبلغ نهایی در این بخش نمایش داده می‌شود."
        />
      </div>
    ) : (
      <>
        <div className="hidden p-2 lg:block">
          <TableShell>
            <table className="w-full border-collapse text-right text-xs">
              <thead className="rounded-lg border-y border-[rgba(var(--ui-border),0.82)] bg-[rgba(var(--ui-surface-muted),0.85)] text-[11px] text-[rgb(var(--ui-text-muted))]">
                <tr>
                  <th className="w-10 border-l border-slate-200/50 p-2 text-center font-bold">ردیف</th>
                  <th className="w-32 border-l border-slate-200/50 p-2 font-bold">نوع ساختار</th>
                  <th className="border-l border-slate-200/50 p-2 font-bold">پیکربندی و خدمات</th>
                  <th className="w-24 border-l border-slate-200/50 p-2 text-center font-bold">ابعاد (cm)</th>
                  <th className="w-12 border-l border-slate-200/50 p-2 text-center font-bold">تعداد</th>
                  <th className="w-24 border-l border-slate-200/50 p-2 text-center font-bold">فی (مترمربع)</th>
                  <th className="w-28 border-l border-slate-200/50 p-2 pl-3 text-left font-bold">مبلغ کل</th>
                  <th className="w-16 p-2 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(var(--ui-border),0.7)]">
                {orderItems.map((item, index) => {
                  const perSquareMeterPrice = resolvePerSquareMeterPrice(item, catalog?.roundStep);
                  const manualLike = isManualLike(item);

                  return (
                    <tr key={item.id} className="transition-colors even:bg-[rgba(var(--ui-surface-muted),0.4)] hover:bg-[rgba(var(--ui-primary),0.06)]">
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] p-2 text-center font-bold tabular-nums text-[rgb(var(--ui-text-muted))]">{toPN(index + 1)}</td>
                      <td className="border-l border-slate-100 p-2">
                        <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black shadow-sm ${manualLike ? 'border-[rgba(var(--ui-warning),0.26)] bg-[rgba(var(--ui-warning),0.12)] text-[rgb(var(--ui-warning))]' : 'border-[rgba(var(--ui-border),0.78)] bg-[rgba(var(--ui-surface),0.92)] text-[rgb(var(--ui-text-muted))]'}`}>
                          {item.title}
                        </span>
                      </td>
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] p-2"><StructureDetails item={item} catalog={catalog} /></td>
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] p-2 text-center font-bold tabular-nums text-[rgb(var(--ui-text-muted))]" dir="ltr">{manualLike ? '-' : `${toPN(item.dimensions.width)} × ${toPN(item.dimensions.height)}`}</td>
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] p-2 text-center font-black tabular-nums text-[rgb(var(--ui-text))]">{toPN(item.itemType === 'manual' ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1))}</td>
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] p-2 text-center font-bold tabular-nums text-[rgb(var(--ui-text-muted))]">
                        {perSquareMeterPrice === null ? '-' : toPN(perSquareMeterPrice.toLocaleString())}
                      </td>
                      <td className="border-l border-[rgba(var(--ui-border),0.55)] bg-[rgba(var(--ui-primary),0.06)] p-2 pl-3 text-left text-sm font-black tabular-nums text-[rgb(var(--ui-text))]">{toPN(item.totalPrice.toLocaleString())}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button onClick={() => onEditItem(item)} size="icon" variant="ghost" title="ویرایش آیتم" iconOnly className="h-7 w-7"><Edit3 size={12} /></Button>
                          <Button onClick={() => onRemoveItem(item.id)} size="icon" variant="danger" title="حذف آیتم" iconOnly className="h-7 w-7"><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        </div>

        <div className="divide-y divide-[rgba(var(--ui-border),0.72)] lg:hidden">
          {orderItems.map((item, index) => (
            <div key={item.id} className="flex items-start justify-between gap-2 p-3 transition-colors hover:bg-[rgba(var(--ui-surface-muted),0.58)]">
              <div className="flex min-w-0 flex-1 gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[rgba(var(--ui-surface-muted),0.82)] text-[10px] font-black text-[rgb(var(--ui-text-muted))]">{toPN(index + 1)}</span>
                <div>
                  <div className="text-[11px] font-black leading-tight text-[rgb(var(--ui-text))]">
                    {item.title}
                    <span className="tabular-nums text-[9px] font-bold tracking-wider text-[rgb(var(--ui-text-muted))]">
                      ({mobileTypeLabel(item)} - {toPN(item.dimensions.count)}عدد)
                    </span>
                  </div>
                  <div className="mt-1"><StructureDetails item={item} catalog={catalog} /></div>
                </div>
              </div>
              <div className="flex h-full flex-col items-end justify-between gap-2">
                <div className="shrink-0 text-xs font-black tabular-nums text-[rgb(var(--ui-primary))]">{toPN(item.totalPrice.toLocaleString())}</div>
                <div className="mt-1 flex gap-1.5">
                  <Button onClick={() => onEditItem(item)} size="icon" variant="ghost" title="ویرایش آیتم" iconOnly className="h-7 w-7"><Edit3 size={12} /></Button>
                  <Button onClick={() => onRemoveItem(item.id)} size="icon" variant="danger" title="حذف آیتم" iconOnly className="h-7 w-7"><Trash2 size={12} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card-quiet flex flex-col items-center justify-between gap-4 border-t border-[rgba(var(--ui-border),0.72)] p-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[rgb(var(--ui-text-muted))]">مبلغ نهایی فاکتور:</span>
            <span className="text-lg font-black tabular-nums text-[rgb(var(--ui-text))] lg:text-xl">{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-[rgb(var(--ui-text-muted))]">تومان</span></span>
          </div>
          <Button onClick={onOpenCheckout} variant="success" className="w-full px-6 py-2.5 sm:w-auto">
            <CheckCircle2 size={16} />
            {editingOrder ? 'ثبت نهایی ویرایش سفارش' : 'تایید و ورود مشخصات'}
          </Button>
        </div>
      </>
    )}
  </WorkspaceCard>
);
