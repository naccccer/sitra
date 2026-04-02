import React from 'react';
import { StructureDetails } from '@/components/shared/StructureDetails';
import { isCustomSquareMeterUnit } from '@/utils/customItemUnits';
import { toPN } from '@/utils/helpers';
import { toSafeAmount } from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';

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

export const OrdersWorkspaceItemsTable = ({ items = [], catalog }) => (
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
        {Array.isArray(items)
          ? items.map((item, itemIndex) => {
              const itemType = String(item?.itemType || 'catalog');
              const isManualLike = itemType === 'manual';
              const widthText = isManualLike ? '-' : `${toPN(item?.dimensions?.width)} × ${toPN(item?.dimensions?.height)}`;
              const countText = itemType === 'manual' ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1);
              const perSquareMeterPrice = resolvePerSquareMeterPrice(item, catalog?.roundStep);

              return (
                <tr key={item.id || `${itemIndex}`} className="transition-colors even:bg-[rgb(var(--ui-surface-muted))]/38 hover:bg-[rgb(var(--ui-accent-muted))]/26">
                  <td className="px-2 py-2 text-center font-bold text-[rgb(var(--ui-text-muted))]">{toPN(itemIndex + 1)}</td>
                  <td className="px-2 py-2">
                    <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[9px] font-semibold shadow-[var(--shadow-soft)] ${isManualLike ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]' : 'border-[rgb(var(--ui-border))] bg-white text-[rgb(var(--ui-text))]'}`}>
                      {item.title}
                    </span>
                  </td>
                  <td className="px-2 py-2"><StructureDetails item={item} catalog={catalog} /></td>
                  <td className="px-2 py-2 text-center font-medium text-[rgb(var(--ui-text-muted))]" dir="ltr">{widthText}</td>
                  <td className="px-2 py-2 text-center font-semibold text-[rgb(var(--ui-text))]">{toPN(countText)}</td>
                  <td className="px-2 py-2 text-center font-medium text-[rgb(var(--ui-text-muted))]">{perSquareMeterPrice === null ? '-' : toPN(perSquareMeterPrice.toLocaleString())}</td>
                  <td className="bg-[rgb(var(--ui-accent-muted))]/32 px-2 py-2 text-left font-semibold text-[rgb(var(--ui-text))]">{toPN(toSafeAmount(item?.totalPrice).toLocaleString())}</td>
                </tr>
              );
            })
          : null}
      </tbody>
    </table>
  </div>
);
