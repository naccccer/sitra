import React, { useMemo, useState } from 'react';
import { FACTORY_ADDRESS, FACTORY_PHONES, toPN } from '../../utils/helpers';
import { StructureDetails } from './StructureDetails';
import { getPaymentMethodLabel, normalizePaymentMethod } from '../../utils/invoice';

const OPERATION_ICON_BASE_PATH = '/icons/operations';

const getDataUrlMimeType = (dataUrl = '') => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return '';
  const semiIndex = dataUrl.indexOf(';');
  if (semiIndex <= 5) return '';
  return dataUrl.slice(5, semiIndex).toLowerCase();
};

const normalizePayment = (payment = {}, fallbackIndex = 0) => ({
  id: String(payment.id || `pay_${fallbackIndex}`),
  date: String(payment.date || '-'),
  amount: Math.max(0, Number(payment.amount) || 0),
  method: normalizePaymentMethod(payment.method || 'cash'),
  reference: String(payment.reference || ''),
  note: String(payment.note || ''),
  receipt: payment?.receipt && typeof payment.receipt === 'object'
    ? {
      filePath: String(payment.receipt.filePath || ''),
      originalName: String(payment.receipt.originalName || ''),
      mimeType: String(payment.receipt.mimeType || ''),
      size: Math.max(0, Number(payment.receipt.size) || 0),
    }
    : null,
});

const getPaymentStatusMeta = (status = '') => {
  if (status === 'paid') return { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'partial') return { label: 'تسویه ناقص', className: 'bg-amber-100 text-amber-700' };
  return { label: 'تسویه نشده', className: 'bg-rose-100 text-rose-700' };
};

const OperationChip = ({ title, iconFile, qty = 1 }) => {
  const [iconFailed, setIconFailed] = useState(false);
  const normalizedTitle = title || 'خدمت';
  const iconSrc = iconFile ? `${OPERATION_ICON_BASE_PATH}/${iconFile}` : '';
  const showFallback = !iconSrc || iconFailed;

  return (
    <div className="rounded-lg border border-slate-300 bg-white overflow-hidden flex flex-col aspect-[2/3]">
      <div className="flex-1 flex items-center justify-center p-1 bg-slate-50/40">
        {showFallback ? (
          <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-400">
            {normalizedTitle.charAt(0)}
          </div>
        ) : (
          <img
            src={iconSrc}
            alt={normalizedTitle}
            loading="lazy"
            onError={() => setIconFailed(true)}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <div className="min-h-12 px-1.5 py-1 text-center border-t border-slate-200 flex flex-col items-center justify-center">
        <div className="text-[10px] leading-4 font-black text-slate-700">{normalizedTitle}</div>
        {qty > 1 && <div className="mt-0.5 text-[9px] font-bold text-slate-500">× {toPN(qty)}</div>}
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
  const isImage = previewDataUrl.startsWith('data:image/');
  const canTryEmbeddedPreview = Boolean(previewDataUrl) && !isImage;

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
  financials = null,
  payments = [],
  invoiceNotes = '',
  type = 'customer', // customer | factory
  preview = false,
  includeAppendix = true,
  factoryIncludeNonProductionManual = true,
}) => {
  const isFactory = type === 'factory';
  const normalizedGrandTotal = Math.max(0, Number(grandTotal) || 0);
  const printableItems = useMemo(() => {
    const baseItems = Array.isArray(items) ? items : [];
    if (!isFactory || factoryIncludeNonProductionManual) return baseItems;
    return baseItems.filter((item) => (item?.itemType || 'catalog') !== 'manual' || Boolean(item?.manual?.productionImpact));
  }, [items, isFactory, factoryIncludeNonProductionManual]);
  const hasItems = printableItems.length > 0;

  const normalizedFinancials = {
    subTotal: Math.max(0, Number(financials?.subTotal ?? normalizedGrandTotal) || 0),
    itemDiscountTotal: Math.max(0, Number(financials?.itemDiscountTotal ?? 0) || 0),
    invoiceDiscountAmount: Math.max(0, Number(financials?.invoiceDiscountAmount ?? 0) || 0),
    taxEnabled: Boolean(financials?.taxEnabled ?? false),
    taxRate: Math.max(0, Number(financials?.taxRate ?? 0) || 0),
    taxAmount: Math.max(0, Number(financials?.taxAmount ?? 0) || 0),
    grandTotal: Math.max(0, Number(financials?.grandTotal ?? normalizedGrandTotal) || normalizedGrandTotal),
    paidTotal: Math.max(0, Number(financials?.paidTotal ?? 0) || 0),
    dueAmount: Math.max(0, Number(financials?.dueAmount ?? 0) || 0),
    paymentStatus: String(financials?.paymentStatus || ''),
  };
  if (!normalizedFinancials.paymentStatus) {
    normalizedFinancials.paymentStatus = normalizedFinancials.dueAmount <= 0 ? 'paid' : normalizedFinancials.paidTotal > 0 ? 'partial' : 'unpaid';
  }

  const normalizedPayments = (Array.isArray(payments) ? payments : []).map((payment, index) => normalizePayment(payment, index));
  const paymentStatusMeta = getPaymentStatusMeta(normalizedFinancials.paymentStatus);
  const rootClassName = preview ? 'printable-area bg-white p-6' : 'printable-area hidden print:block bg-white p-6';
  const title = isFactory ? 'برگه سفارش تولید (نسخه کارخانه)' : 'پیش‌فاکتور رسمی سفارش';

  const appendixEntries = useMemo(() => {
    if (!includeAppendix) return [];

    const operationMap = new Map((catalog?.operations || []).map((op) => [String(op.id), op]));

    return printableItems
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
  }, [catalog, includeAppendix, printableItems]);

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
          {printableItems.map((item, i) => {
            const isManual = (item?.itemType || 'catalog') === 'manual';
            const width = isManual ? '-' : (item?.dimensions?.width ?? '-');
            const height = isManual ? '-' : (item?.dimensions?.height ?? '-');
            const count = isManual ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1) : (item?.dimensions?.count ?? 1);
            const unitPrice = Math.max(0, Number(item?.unitPrice) || 0);
            const totalPrice = Math.max(0, Number(item?.totalPrice) || 0);

            return (
              <tr key={item.id || `${i}`} className="even:bg-slate-50/70 break-inside-avoid">
                <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i + 1)}</td>
                <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
                <td className="border border-slate-300 p-2 align-top"><StructureDetails item={item} catalog={catalog} /></td>
                <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(width)} × {toPN(height)}</td>
                <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(count)}</td>
                {!isFactory && <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top">{toPN(unitPrice.toLocaleString())}</td>}
                {!isFactory && <td className="border border-slate-300 p-2 font-black tabular-nums bg-slate-100 text-left align-top text-[13px]">{toPN(totalPrice.toLocaleString())}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch mb-4 break-inside-avoid">
        <div className="md:w-1/2 p-3 text-[10px] font-bold text-slate-500 space-y-1.5 border border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-700">{isFactory ? 'ملاحظات تولید:' : 'توضیحات و شرایط:'}</p>
          <ul className="list-disc list-inside space-y-1">
            {isFactory ? (
              <>
                <li>برش و تولید دقیقاً مطابق با ابعاد و پیکربندی درج شده انجام شود.</li>
                <li>در صورت وجود الگو (فایل یا کارتن)، تطبیق نهایی الزامی است.</li>
                {!factoryIncludeNonProductionManual && <li>آیتم‌های دستی غیرتولیدی در این نسخه چاپ حذف شده‌اند.</li>}
              </>
            ) : (
              <>
                <li>تمامی ابعاد به سانتی‌متر ثبت شده‌اند.</li>
                <li>اعتبار پیش‌فاکتور ۳ روز کاری است.</li>
                <li>مبنای تسویه، مبالغ نهایی درج‌شده در همین نسخه است.</li>
              </>
            )}
          </ul>
          {!isFactory && invoiceNotes && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-700">
              <div className="font-black mb-1">یادداشت فاکتور:</div>
              <div className="font-bold whitespace-pre-wrap">{invoiceNotes}</div>
            </div>
          )}
        </div>

        <div className="md:w-72 border-[1.5px] border-slate-800 p-4 rounded-2xl bg-slate-900 text-white">
          {!isFactory && (
            <div className="mb-2">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black ${paymentStatusMeta.className}`}>
                {paymentStatusMeta.label}
              </span>
            </div>
          )}

          {!isFactory && (
            <div className="space-y-1 border-b border-slate-700 pb-2 mb-2 text-[11px]">
              <div className="flex justify-between"><span className="text-slate-300">جمع قبل از تخفیف:</span><span className="tabular-nums">{toPN(normalizedFinancials.subTotal.toLocaleString())}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">تخفیف سطری:</span><span className="tabular-nums">{toPN(normalizedFinancials.itemDiscountTotal.toLocaleString())}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">تخفیف فاکتور:</span><span className="tabular-nums">{toPN(normalizedFinancials.invoiceDiscountAmount.toLocaleString())}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">مالیات:</span><span className="tabular-nums">{toPN(normalizedFinancials.taxAmount.toLocaleString())}</span></div>
            </div>
          )}

          <div className="flex justify-between text-lg font-black tabular-nums items-center">
            <span className="text-slate-300 text-xs">{isFactory ? 'جمع کل سفارش:' : 'جمع کل فاکتور:'}</span>
            <span>{toPN(normalizedFinancials.grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
          </div>

          {!isFactory && (
            <div className="space-y-1 mt-2 pt-2 border-t border-slate-700 text-[11px] tabular-nums">
              <div className="flex justify-between"><span className="text-slate-300">پرداخت‌شده:</span><span>{toPN(normalizedFinancials.paidTotal.toLocaleString())}</span></div>
              <div className="flex justify-between font-black"><span className="text-slate-300">مانده:</span><span>{toPN(normalizedFinancials.dueAmount.toLocaleString())}</span></div>
            </div>
          )}
        </div>
      </div>

      {!isFactory && normalizedPayments.length > 0 && (
        <div className="mb-4 break-inside-avoid border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700">ریز پرداخت‌ها</div>
          <table className="w-full text-xs">
            <thead className="bg-white text-slate-500 border-y border-slate-200">
              <tr>
                <th className="p-2 text-right font-black">تاریخ</th>
                <th className="p-2 text-right font-black">روش</th>
                <th className="p-2 text-right font-black">مرجع</th>
                <th className="p-2 text-right font-black">رسید</th>
                <th className="p-2 text-left font-black">مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {normalizedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="p-2 font-bold text-slate-600">{toPN(payment.date)}</td>
                  <td className="p-2 font-bold text-slate-700">{getPaymentMethodLabel(payment.method)}</td>
                  <td className="p-2 font-bold text-slate-500">{payment.reference || '-'}</td>
                  <td className="p-2 font-bold text-slate-500">{payment.receipt?.originalName || '-'}</td>
                  <td className="p-2 text-left font-black tabular-nums text-slate-900">{toPN(payment.amount.toLocaleString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="break-inside-avoid mb-4 pt-2 border-t border-slate-300 text-[10px] font-bold text-slate-600 flex flex-wrap items-center gap-2">
        <span className="text-slate-800">آدرس کارخانه:</span>
        <span>{FACTORY_ADDRESS}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-800">شماره تماس:</span>
        <span className="tabular-nums" dir="ltr">{FACTORY_PHONES}</span>
      </div>

      {includeAppendix && appendixEntries.length > 0 && (
        <section className="page-break-before mt-6">
          <div className="mb-4 border-b-2 border-slate-800 pb-2">
            <h2 className="text-lg font-black text-slate-900">پیوست الگوها و خدمات انتخابی</h2>
            <p className="mt-1 text-[11px] font-bold text-slate-500">هر کارت مربوط به یک ردیف از جدول اصلی فاکتور است.</p>
          </div>

          <div className="appendix-grid grid grid-cols-1 gap-4">
            {appendixEntries.map((entry) => (
              <article key={entry.key} className="appendix-card break-inside-avoid rounded-xl border border-slate-300 bg-white p-4">
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[12px] font-bold text-slate-700">
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
                    <div className="mb-2 text-[12px] font-black text-slate-700">خدمات و جاساز انتخابی</div>
                    {entry.services.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
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
