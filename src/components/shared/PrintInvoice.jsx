import React from 'react';
import { toPN } from '../../utils/helpers';
import { StructureDetails } from './StructureDetails';

export const PrintInvoice = ({ 
  items = [], 
  catalog, 
  customerName = '', 
  orderCode = '- در انتظار ثبت -', 
  date = new Date().toLocaleDateString('fa-IR'),
  grandTotal = 0,
  type = 'customer', // 'customer' | 'factory'
  preview = false
}) => {
  
  if (!items || items.length === 0) return null;

  const isFactory = type === 'factory';
  const rootClassName = preview ? 'printable-area bg-white p-6' : 'printable-area hidden print:block bg-white p-6';
  const title = isFactory ? 'برگه سفارش تولید (نسخه کارخانه)' : 'پیش‌فاکتور رسمی سفارش';

  return (
    <div className={rootClassName} dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      {/* هدر فاکتور */}
      <div className="flex justify-between items-start border-b-[2px] border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">گلس دیزاین <span className="text-slate-400 font-normal">| Sitra</span></h1>
            <p className="text-xs font-bold mt-1 text-slate-600">{title}</p>
          </div>
        </div>
        <div className="text-left text-xs font-bold space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[180px]">
          <div className="flex justify-between gap-4"><span className="text-slate-500">تاریخ:</span> <span>{toPN(date)}</span></div>
          {customerName && <div className="flex justify-between gap-4"><span className="text-slate-500">مشتری:</span> <span>{customerName}</span></div>}
          <div className="flex justify-between gap-4 border-t pt-1 mt-1"><span className="text-slate-500">کد رهگیری:</span> <span className="tabular-nums text-slate-900 font-black tracking-wider" dir="ltr">{toPN(orderCode)}</span></div>
        </div>
      </div>

      {/* جدول اقلام */}
      <table className="w-full text-right border-collapse border border-slate-300 mb-6 text-xs">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="border border-slate-300 p-2 w-10 text-center">ردیف</th>
            <th className="border border-slate-300 p-2 w-24">نوع ساختار</th>
            <th className="border border-slate-300 p-2 text-right">جزئیات فنی و پیکربندی</th>
            <th className="border border-slate-300 p-2 w-24 text-center">ابعاد (cm)</th>
            <th className="border border-slate-300 p-2 w-12 text-center">تعداد</th>
            {!isFactory && <th className="border border-slate-300 p-2 w-28 text-center">فی (تومان)</th>}
            {!isFactory && <th className="border border-slate-300 p-2 w-32 text-left">مبلغ کل (تومان)</th>}
          </tr>
        </thead>
        <tbody className="text-slate-800">
          {items.map((item, i) => (
            <tr key={item.id} className="even:bg-slate-50/70 break-inside-avoid">
              <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i+1)}</td>
              <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
              <td className="border border-slate-300 p-2 align-top"><StructureDetails item={item} catalog={catalog} /></td>
              <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
              <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(item.dimensions.count)}</td>
              {!isFactory && <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top">{toPN(item.unitPrice.toLocaleString())}</td>}
              {!isFactory && <td className="border border-slate-300 p-2 font-black tabular-nums bg-slate-100 text-left align-top text-[13px]">{toPN(item.totalPrice.toLocaleString())}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* فوتر فاکتور */}
      <div className="flex justify-between items-end mb-4 break-inside-avoid">
        <div className="w-1/2 p-3 text-[10px] font-bold text-slate-500 space-y-1.5 border border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-700">{isFactory ? 'ملاحظات تولید:' : 'توضیحات و شرایط:'}</p>
          <ul className="list-disc list-inside space-y-1">
            {isFactory ? (
              <>
                <li>برش و تولید دقیقاً مطابق با ابعاد و پیکربندی درج شده انجام شود.</li>
                <li>در صورت وجود الگو (فایل یا کارتن)، تطبیق نهایی الزامی است.</li>
              </>
            ) : (
              <>
                <li>تمامی ابعاد به سانتی‌متر و با دقت میلی‌متر ثبت شده‌اند.</li>
                <li>مسئولیت صحت ابعاد و الگوها بر عهده مشتری می‌باشد.</li>
                <li>اعتبار پیش‌فاکتور ۳ روز کاری می‌باشد.</li>
              </>
            )}
          </ul>
        </div>
        
        {!isFactory && (
          <div className="w-72 border-[1.5px] border-slate-800 p-4 rounded-2xl bg-slate-900 text-white">
            <div className="flex justify-between text-lg font-black tabular-nums items-center">
              <span className="text-slate-300 text-xs">جمع کل فاکتور:</span>
              <span>{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
