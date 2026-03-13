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
    <Card padding="sm" tone="muted" className="space-y-3">
      <h4 className="text-xs font-black text-slate-800">تنظیمات مالی فاکتور</h4>

      {activeTab === 'discount' && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600">نوع تخفیف فاکتور</label>
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
            <label className="text-[10px] font-black text-slate-600">مقدار تخفیف کل</label>
            <div className={`h-9 w-full rounded-lg border ${invoiceDraft.discountType === 'none' ? 'border-slate-100 bg-slate-100' : 'border-slate-200 bg-white'}`}>
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
            <label className="text-[10px] font-black text-slate-600">مالیات</label>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(invoiceDraft.taxEnabled)}
                onChange={(event) => onDraftChange('taxEnabled', event.target.checked)}
              />
              اعمال مالیات
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600">نرخ مالیات (%)</label>
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
        <label className="text-[10px] font-black text-slate-600">یادداشت فاکتور</label>
        <textarea
          value={invoiceDraft.invoiceNotes}
          onChange={(event) => onDraftChange('invoiceNotes', event.target.value)}
          className="focus-ring mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold"
          placeholder="یادداشت داخلی یا توضیح برای مشتری"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">جمع قبل از تخفیف: {toPN(financials.subTotal.toLocaleString())}</div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">تخفیف سطری: {toPN(financials.itemDiscountTotal.toLocaleString())}</div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">تخفیف کل: {toPN(financials.invoiceDiscountAmount.toLocaleString())}</div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">مالیات: {toPN(financials.taxAmount.toLocaleString())}</div>
      </div>
    </Card>
  );
};
