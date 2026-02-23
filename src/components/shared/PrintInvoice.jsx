import React, { useMemo, useState } from 'react';
import { toPN } from '../../utils/helpers';
import { StructureDetails } from './StructureDetails';

const OPERATION_ICON_BASE_PATH = '/icons/operations';

const getDataUrlMimeType = (dataUrl = '') => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return '';
  const semiIndex = dataUrl.indexOf(';');
  if (semiIndex <= 5) return '';
  return dataUrl.slice(5, semiIndex).toLowerCase();
};

const getFileExtension = (fileName = '') => {
  const name = String(fileName || '').trim();
  if (!name.includes('.')) return '';
  return name.split('.').pop().toLowerCase();
};

const OperationChip = ({ title, iconFile, qty = 1 }) => {
  const [iconFailed, setIconFailed] = useState(false);
  const normalizedTitle = title || 'خدمت';
  const iconSrc = iconFile ? `${OPERATION_ICON_BASE_PATH}/${iconFile}` : '';
  const showFallback = !iconSrc || iconFailed;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-black text-slate-500">
        {showFallback ? (
          normalizedTitle.charAt(0)
        ) : (
          <img
            src={iconSrc}
            alt={normalizedTitle}
            loading="lazy"
            onError={() => setIconFailed(true)}
            className="h-full w-full object-contain p-1"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-bold text-slate-800">{normalizedTitle}</div>
        {qty > 1 && <div className="mt-0.5 text-[10px] font-bold text-slate-500">تعداد انتخاب: {toPN(qty)}</div>}
      </div>
    </div>
  );
};

const PatternPreview = ({ pattern }) => {
  const type = pattern?.type || 'none';

  if (type === 'carton') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
        این آیتم با الگوی فیزیکی (کارتن/شابلون) ثبت شده است.
      </div>
    );
  }

  if (type !== 'upload') {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-bold text-slate-500">
        برای این آیتم الگوی آپلودی ثبت نشده است.
      </div>
    );
  }

  const fileName = pattern?.fileName || 'pattern-file';
  const previewDataUrl = pattern?.previewDataUrl || '';
  const mimeType = getDataUrlMimeType(previewDataUrl);
  const extension = getFileExtension(fileName);
  const isImage = previewDataUrl.startsWith('data:image/');
  const canTryEmbeddedPreview = Boolean(previewDataUrl) && !isImage;
  const readableType = mimeType || (extension ? extension.toUpperCase() : 'unknown');

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-600 break-all">
        {fileName}
      </div>

      {isImage && (
        <img
          src={previewDataUrl}
          alt={fileName}
          loading="lazy"
          className="pattern-preview-thumb w-full rounded-lg border border-slate-200 bg-white object-contain"
        />
      )}

      {canTryEmbeddedPreview && (
        <div className="space-y-2">
          <object
            data={previewDataUrl}
            type={mimeType || 'application/pdf'}
            className="pattern-preview-thumb w-full rounded-lg border border-slate-200 bg-white"
            aria-label={`preview-${fileName}`}
          >
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500">
              پیش‌نمایش فایل قابل نمایش نبود. از نام فایل برای پیگیری استفاده شود.
            </div>
          </object>
          <div className="text-[10px] font-bold text-slate-500">
            اگر پیش‌نمایش نمایش داده نشد، از نام فایل برای پیگیری استفاده شود.
          </div>
        </div>
      )}

      {!previewDataUrl && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500">
          پیش‌نمایش فایل در داده سفارش موجود نیست.
        </div>
      )}

      <div className="text-[10px] font-bold text-slate-500">
        نوع فایل: <span className="font-mono text-slate-700">{readableType}</span>
      </div>
    </div>
  );
};

export const PrintInvoice = ({
  items = [],
  catalog,
  customerName = '',
  orderCode = '- در انتظار ثبت -',
  date = new Date().toLocaleDateString('fa-IR'),
  grandTotal = 0,
  type = 'customer', // 'customer' | 'factory'
  preview = false,
  includeAppendix = true
}) => {
  const hasItems = Array.isArray(items) && items.length > 0;

  const isFactory = type === 'factory';
  const normalizedGrandTotal = Math.max(0, Number(grandTotal) || 0);
  const rootClassName = preview ? 'printable-area bg-white p-6' : 'printable-area hidden print:block bg-white p-6';
  const title = isFactory ? 'برگه سفارش تولید (نسخه کارخانه)' : 'پیش‌فاکتور رسمی سفارش';

  const appendixEntries = useMemo(() => {
    if (!includeAppendix) return [];

    const operationMap = new Map((catalog?.operations || []).map((op) => [String(op.id), op]));

    return items
      .map((item, index) => {
        const ops = item?.operations && typeof item.operations === 'object' ? item.operations : {};
        const services = Object.entries(ops)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([serviceId, qty]) => {
            const op = operationMap.get(String(serviceId));
            return {
              id: String(serviceId),
              title: op?.title || 'خدمت ناشناس',
              iconFile: op?.iconFile || '',
              qty: Math.max(1, Number(qty) || 1),
            };
          });

        const pattern = item?.pattern && typeof item.pattern === 'object' ? item.pattern : { type: 'none' };
        const hasPattern = Boolean(pattern?.type && pattern.type !== 'none');
        if (!hasPattern && services.length === 0) return null;

        return {
          key: `${item?.id || `item-${index}`}-${index}`,
          rowNumber: index + 1,
          title: item?.title || 'آیتم سفارش',
          width: item?.dimensions?.width ?? '-',
          height: item?.dimensions?.height ?? '-',
          count: item?.dimensions?.count ?? '-',
          hasPattern,
          pattern,
          services,
        };
      })
      .filter(Boolean);
  }, [catalog, includeAppendix, items]);

  if (!hasItems) return null;

  return (
    <div className={rootClassName} dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
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
              <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i + 1)}</td>
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

        <div className="w-72 border-[1.5px] border-slate-800 p-4 rounded-2xl bg-slate-900 text-white">
          <div className="flex justify-between text-lg font-black tabular-nums items-center">
            <span className="text-slate-300 text-xs">{isFactory ? 'جمع کل سفارش:' : 'جمع کل فاکتور:'}</span>
            <span>{toPN(normalizedGrandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
          </div>
        </div>
      </div>

      {includeAppendix && appendixEntries.length > 0 && (
        <section className="page-break-before mt-6">
          <div className="mb-4 border-b-2 border-slate-800 pb-2">
            <h2 className="text-lg font-black text-slate-900">پیوست الگوها و خدمات انتخابی</h2>
            <p className="mt-1 text-[11px] font-bold text-slate-500">هر کارت مربوط به یک ردیف از جدول اصلی فاکتور است.</p>
          </div>

          <div className="appendix-grid grid grid-cols-1 md:grid-cols-2 gap-4">
            {appendixEntries.map((entry) => (
              <article key={entry.key} className="appendix-card break-inside-avoid rounded-xl border border-slate-300 bg-white p-3">
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-[11px] font-bold text-slate-700">
                  <div className="text-blue-700">آیتم ردیف {toPN(entry.rowNumber)} فاکتور</div>
                  <div className="mt-1">{entry.title}</div>
                  <div className="mt-1 tabular-nums" dir="ltr">
                    {toPN(entry.width)} × {toPN(entry.height)} | {toPN(entry.count)} عدد
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[11px] font-black text-slate-700">الگو</div>
                    {entry.hasPattern ? (
                      <PatternPreview pattern={entry.pattern} />
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-bold text-slate-500">
                        برای این آیتم الگو ثبت نشده است.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-black text-slate-700">خدمات و جاساز انتخابی</div>
                    {entry.services.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {entry.services.map((service) => (
                          <OperationChip
                            key={`${entry.key}-${service.id}`}
                            title={service.title}
                            iconFile={service.iconFile}
                            qty={service.qty}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-bold text-slate-500">
                        خدمتی برای این آیتم انتخاب نشده است.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
