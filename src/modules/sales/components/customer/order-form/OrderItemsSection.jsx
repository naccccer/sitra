import React from 'react';
import { CheckCircle2, Edit3, Plus, Printer, Trash2 } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { StructureDetails } from '@/components/shared/StructureDetails';

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
  <div className="print-hide mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between bg-slate-900 p-3 text-white">
      <span className="pl-2 text-sm font-black">سبد سفارش مشتری</span>
      <div className="flex items-center gap-2">
        {isStaffContext && (
          <button onClick={onOpenManualItemModal} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-white/20">
            <Plus size={14} />
            آیتم دستی
            {isEditingManualItem && <span className="rounded-full bg-amber-500 px-1.5 text-[9px] text-white">در حال ویرایش</span>}
          </button>
        )}
        <button onClick={onPrintInvoice} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition-all hover:bg-blue-500">
          <Printer size={14} />
          چاپ پیش‌فاکتور
        </button>
      </div>
    </div>

    {orderItems.length === 0 ? (
      <div className="bg-slate-50/50 p-8 text-center text-xs font-bold text-slate-400">آیتمی در سفارش ثبت نشده است.</div>
    ) : (
      <>
        <div className="hidden overflow-x-auto p-2 lg:block">
          <table className="w-full border-collapse text-right text-xs">
            <thead className="rounded-lg border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500">
              <tr>
                <th className="w-10 border-l border-slate-200/50 p-2 text-center font-bold">ردیف</th>
                <th className="w-32 border-l border-slate-200/50 p-2 font-bold">نوع ساختار</th>
                <th className="border-l border-slate-200/50 p-2 font-bold">پیکربندی و خدمات</th>
                <th className="w-24 border-l border-slate-200/50 p-2 text-center font-bold">ابعاد (cm)</th>
                <th className="w-12 border-l border-slate-200/50 p-2 text-center font-bold">تعداد</th>
                <th className="w-24 border-l border-slate-200/50 p-2 text-center font-bold">فی (تومان)</th>
                <th className="w-28 border-l border-slate-200/50 p-2 pl-3 text-left font-bold">مبلغ کل</th>
                <th className="w-16 p-2 text-center font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems.map((item, index) => (
                <tr key={item.id} className="transition-colors even:bg-slate-50/50 hover:bg-blue-50/20">
                  <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-400">{toPN(index + 1)}</td>
                  <td className="border-l border-slate-100 p-2">
                    <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black shadow-sm ${item.itemType === 'manual' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                      {item.title}
                    </span>
                  </td>
                  <td className="border-l border-slate-100 p-2"><StructureDetails item={item} catalog={catalog} /></td>
                  <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-600" dir="ltr">{item.itemType === 'manual' ? '-' : `${toPN(item.dimensions.width)} × ${toPN(item.dimensions.height)}`}</td>
                  <td className="border-l border-slate-100 p-2 text-center font-black tabular-nums text-slate-800">{toPN(item.dimensions.count)}</td>
                  <td className="border-l border-slate-100 p-2 text-center font-bold tabular-nums text-slate-500">{toPN(item.unitPrice.toLocaleString())}</td>
                  <td className="border-l border-slate-100 bg-blue-50/30 p-2 pl-3 text-left text-sm font-black tabular-nums text-slate-900">{toPN(item.totalPrice.toLocaleString())}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => onEditItem(item)} className="rounded border border-slate-200 bg-white p-1 text-slate-400 shadow-sm transition-colors hover:text-amber-600"><Edit3 size={12} /></button>
                      <button onClick={() => onRemoveItem(item.id)} className="rounded border border-slate-200 bg-white p-1 text-slate-400 shadow-sm transition-colors hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {orderItems.map((item, index) => (
            <div key={item.id} className="flex items-start justify-between p-3 transition-colors hover:bg-slate-50">
              <div className="flex w-[75%] gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-400">{toPN(index + 1)}</span>
                <div>
                  <div className="text-[11px] font-black leading-tight text-slate-800">
                    {item.title}
                    <span className="tabular-nums text-[9px] font-bold tracking-wider text-slate-400">
                      ({item.itemType === 'manual' ? 'آیتم دستی' : `${toPN(item.dimensions.width)}×${toPN(item.dimensions.height)}`} - {toPN(item.dimensions.count)}عدد)
                    </span>
                  </div>
                  <div className="mt-1"><StructureDetails item={item} catalog={catalog} /></div>
                </div>
              </div>
              <div className="flex h-full flex-col items-end justify-between gap-2">
                <div className="shrink-0 text-xs font-black tabular-nums text-blue-600">{toPN(item.totalPrice.toLocaleString())}</div>
                <div className="mt-1 flex gap-1.5">
                  <button onClick={() => onEditItem(item)} className="rounded border border-slate-200 bg-white p-1 text-slate-400 shadow-sm hover:text-amber-500"><Edit3 size={12} /></button>
                  <button onClick={() => onRemoveItem(item.id)} className="rounded border border-slate-200 bg-white p-1 text-slate-400 shadow-sm hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500">مبلغ نهایی فاکتور:</span>
            <span className="text-lg font-black tabular-nums text-slate-900 lg:text-xl">{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-500">تومان</span></span>
          </div>
          <button onClick={onOpenCheckout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition-all hover:bg-green-500 active:scale-95 sm:w-auto">
            <CheckCircle2 size={16} />
            {editingOrder ? 'ثبت نهایی ویرایش سفارش' : 'تایید و ورود مشخصات'}
          </button>
        </div>
      </>
    )}
  </div>
);
