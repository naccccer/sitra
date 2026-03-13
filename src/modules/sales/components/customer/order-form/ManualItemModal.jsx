import React from 'react';
import { toPN } from '@/utils/helpers';

export const ManualItemModal = ({
  isOpen,
  manualDraft,
  manualTouched,
  manualErrors,
  manualPreviewPricing,
  manualCanSubmit,
  isEditingManual,
  onFieldChange,
  onSubmit,
  onClose,
  onCancelEdit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="print-hide fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="text-sm font-black">آیتم دستی فاکتور</div>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black hover:bg-white/20">بستن</button>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
          {isEditingManual && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
              <span>در حال ویرایش آیتم دستی</span>
              <button onClick={onCancelEdit} className="text-amber-800 underline">لغو ویرایش</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-black text-slate-600">عنوان</label>
              <input type="text" value={manualDraft.title} onChange={(event) => onFieldChange('title', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" placeholder="مثال: بسته‌بندی سفارشی" />
              {manualTouched.title && manualErrors.title && <div className="text-[10px] font-bold text-red-600">{manualErrors.title}</div>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600">واحد</label>
              <input type="text" value={manualDraft.unitLabel} onChange={(event) => onFieldChange('unitLabel', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" placeholder="عدد" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600">تعداد</label>
              <input type="number" value={manualDraft.qty} onChange={(event) => onFieldChange('qty', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" dir="ltr" />
              {manualTouched.qty && manualErrors.qty && <div className="text-[10px] font-bold text-red-600">{manualErrors.qty}</div>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600">قیمت فی (تومان)</label>
              <input type="number" value={manualDraft.unitPrice} onChange={(event) => onFieldChange('unitPrice', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" dir="ltr" />
              {manualTouched.unitPrice && manualErrors.unitPrice && <div className="text-[10px] font-bold text-red-600">{manualErrors.unitPrice}</div>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600">نوع تخفیف</label>
              <select value={manualDraft.discountType} onChange={(event) => onFieldChange('discountType', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold">
                <option value="none">بدون تخفیف</option>
                <option value="percent">درصدی</option>
                <option value="fixed">ثابت</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600">مقدار تخفیف</label>
              <input type="number" value={manualDraft.discountValue} onChange={(event) => onFieldChange('discountValue', event.target.value)} disabled={manualDraft.discountType === 'none'} className={`h-10 w-full rounded-lg border px-3 text-xs font-bold ${manualDraft.discountType === 'none' ? 'border-slate-100 bg-slate-100 text-slate-400' : 'border-slate-200 bg-slate-50'}`} dir="ltr" />
              {manualTouched.discountValue && manualErrors.discountValue && <div className="text-[10px] font-bold text-red-600">{manualErrors.discountValue}</div>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-black text-slate-600">توضیحات آیتم</label>
              <input type="text" value={manualDraft.description} onChange={(event) => onFieldChange('description', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" placeholder="اختیاری" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={Boolean(manualDraft.taxable)} onChange={(event) => onFieldChange('taxable', event.target.checked)} />
              مشمول مالیات
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">مبلغ پایه: {toPN(manualPreviewPricing.catalogLineTotal.toLocaleString())}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">تخفیف: {toPN(manualPreviewPricing.itemDiscountAmount.toLocaleString())}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900">مبلغ نهایی: {toPN(manualPreviewPricing.finalLineTotal.toLocaleString())}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onSubmit} disabled={!manualCanSubmit} className={`h-10 rounded-lg px-4 text-xs font-black transition-colors ${manualCanSubmit ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-200 text-slate-400'}`}>
              {isEditingManual ? 'بروزرسانی آیتم دستی' : 'افزودن آیتم دستی'}
            </button>
            {isEditingManual && (
              <button onClick={onCancelEdit} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:bg-slate-50">لغو ویرایش</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
