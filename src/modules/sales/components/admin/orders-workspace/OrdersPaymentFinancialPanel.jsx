import React from 'react';
import { toPN } from '@/utils/helpers';
import { PriceInput } from '@/components/shared/PriceInput';
import { Card, Input, Select } from '@/components/shared/ui';

export const OrdersPaymentFinancialPanel = ({
  activeTab,
  invoiceDraft,
  financials,
  onDraftChange,
}) => {
  if (!invoiceDraft || !financials) return null;
  if (activeTab !== 'discount' && activeTab !== 'tax') return null;

  return (
    <Card padding="none" className="overflow-hidden border-white/60 bg-white/88 shadow-[var(--shadow-surface)]">
      <div className="border-b border-white/60 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,12,24,0.94))] px-4 py-3 text-white">
        <div className="section-kicker text-white/55">فاکتور</div>
        <h4 className="mt-1 text-sm font-black">تنظیمات مالی فاکتور</h4>
      </div>

      <div className="space-y-4 p-4">

        {activeTab === 'discount' && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[rgb(var(--ui-text-muted))]">نوع تخفیف فاکتور</label>
              <Select
                value={invoiceDraft.discountType}
                onChange={(event) => onDraftChange('discountType', event.target.value)}
                className="h-9 text-xs"
              >
                <option value="none">بدون تخفیف کل</option>
                <option value="percent">تخفیف درصدی</option>
                <option value="fixed">تخفیف ثابت</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[rgb(var(--ui-text-muted))]">مقدار تخفیف کل</label>
              <div className={`h-9 w-full rounded-[var(--radius-md)] border ${invoiceDraft.discountType === 'none' ? 'border-slate-100 bg-slate-100' : 'border-[rgb(var(--ui-border))] bg-white'}`}>
                <PriceInput
                  value={invoiceDraft.discountValue}
                  onChange={(value) => onDraftChange('discountValue', value)}
                  disabled={invoiceDraft.discountType === 'none'}
                  placeholder="0"
                  className={invoiceDraft.discountType === 'none' ? 'text-slate-400' : ''}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[rgb(var(--ui-text-muted))]">مالیات</label>
              <label className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[rgb(var(--ui-border-soft))] bg-white px-2 text-xs font-bold text-[rgb(var(--ui-text))] shadow-[var(--shadow-soft)]">
                <input
                  type="checkbox"
                  checked={Boolean(invoiceDraft.taxEnabled)}
                  onChange={(event) => onDraftChange('taxEnabled', event.target.checked)}
                />
                اعمال مالیات
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[rgb(var(--ui-text-muted))]">نرخ مالیات (%)</label>
              <Input
                type="number"
                value={invoiceDraft.taxRate}
                onChange={(event) => onDraftChange('taxRate', event.target.value)}
                disabled={!invoiceDraft.taxEnabled}
                className={`h-9 text-xs ${!invoiceDraft.taxEnabled ? 'border-slate-100 bg-slate-100 text-slate-400' : ''}`}
                dir="ltr"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-black text-[rgb(var(--ui-text-muted))]">یادداشت فاکتور</label>
          <textarea
            value={invoiceDraft.invoiceNotes}
            onChange={(event) => onDraftChange('invoiceNotes', event.target.value)}
            className="focus-ring mt-1 min-h-20 w-full rounded-[var(--radius-md)] border border-[rgb(var(--ui-border-soft))] bg-white p-2 text-xs font-bold shadow-[var(--shadow-soft)]"
            placeholder="یادداشت داخلی یا توضیح برای مشتری"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="surface-card px-3 py-2 text-xs font-black text-[rgb(var(--ui-text))]">جمع قبل از تخفیف: {toPN(financials.subTotal.toLocaleString())}</div>
          <div className="surface-card px-3 py-2 text-xs font-black text-[rgb(var(--ui-text))]">تخفیف سطری: {toPN(financials.itemDiscountTotal.toLocaleString())}</div>
          <div className="surface-card px-3 py-2 text-xs font-black text-[rgb(var(--ui-text))]">تخفیف کل: {toPN(financials.invoiceDiscountAmount.toLocaleString())}</div>
          <div className="surface-card px-3 py-2 text-xs font-black text-[rgb(var(--ui-text))]">مالیات: {toPN(financials.taxAmount.toLocaleString())}</div>
        </div>
      </div>
    </Card>
  );
};
