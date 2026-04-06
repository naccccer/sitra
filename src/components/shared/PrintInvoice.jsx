import React, { useMemo, useState } from 'react';
import { toPN } from '../../utils/helpers';
import { StructureDetails } from './StructureDetails';
import { getPaymentMethodLabel, normalizePaymentMethod, resolveItemArea, resolvePerSquareMeterPrice } from '../../utils/invoice';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '../../utils/profile';
import { OperationChip, PatternPreview } from '@/components/shared/print-invoice/PatternPreview';

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
  if (status === 'paid') return { label: 'تسویه کامل', className: 'bg-[rgb(var(--ui-success-bg))] text-[rgb(var(--ui-success-text))]' };
  if (status === 'partial') return { label: 'تسویه ناقص', className: 'bg-[rgb(var(--ui-warning-bg))] text-[rgb(var(--ui-warning-text))]' };
  return { label: 'تسویه نشده', className: 'bg-[rgb(var(--ui-danger-bg))] text-[rgb(var(--ui-danger-text))]' };
};

const DEFAULT_PAGE_CAPACITY_UNITS = 10.8;

const estimateInvoiceRowUnits = (item = {}) => {
  const itemType = String(item?.itemType || 'catalog');
  if (itemType === 'manual') return 1.0;

  const operations = item?.operations && typeof item.operations === 'object' ? item.operations : {};
  const servicesCount = Object.keys(operations).filter((serviceId) => Number(operations[serviceId] || 0) > 0).length;
  const hasPattern = Boolean(item?.pattern?.type && item.pattern.type !== 'none');
  const isDouble = item?.activeTab === 'double';
  const isLaminate = item?.activeTab === 'laminate' || item?.config?.pane1?.isLaminated || item?.config?.pane2?.isLaminated;

  const estimated = 1
    + Math.min(0.75, servicesCount * 0.16)
    + (hasPattern ? 0.2 : 0)
    + (isDouble ? 0.35 : 0)
    + (isLaminate ? 0.25 : 0);

  return Math.max(1, Math.min(2.4, estimated));
};

const paginateInvoiceItems = (items = [], { pageCapacityUnits, lastPageCapacityUnits } = {}) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length === 0) return [];

  const pageCapacity = Number.isFinite(pageCapacityUnits) && pageCapacityUnits > 0
    ? pageCapacityUnits
    : DEFAULT_PAGE_CAPACITY_UNITS;
  const lastCapacity = Number.isFinite(lastPageCapacityUnits) && lastPageCapacityUnits > 0
    ? Math.min(pageCapacity, lastPageCapacityUnits)
    : pageCapacity;

  const canFitRemainingInLastPage = (startIndex) => {
    let units = 0;
    for (let i = startIndex; i < normalizedItems.length; i += 1) {
      units += estimateInvoiceRowUnits(normalizedItems[i]);
    }
    return units <= lastCapacity;
  };

  const pages = [];
  let index = 0;

  while (index < normalizedItems.length) {
    if (canFitRemainingInLastPage(index)) {
      pages.push(normalizedItems.slice(index));
      break;
    }

    const pageItems = [];
    let consumedUnits = 0;

    while (index < normalizedItems.length) {
      const item = normalizedItems[index];
      const nextItemUnits = estimateInvoiceRowUnits(item);
      const canPlace = consumedUnits + nextItemUnits <= pageCapacity || pageItems.length === 0;

      if (!canPlace) break;

      pageItems.push(item);
      consumedUnits += nextItemUnits;
      index += 1;

      if (canFitRemainingInLastPage(index)) break;
    }

    if (pageItems.length === 0) {
      pageItems.push(normalizedItems[index]);
      index += 1;
    }

    pages.push(pageItems);
  }

  return pages.filter((page) => page.length > 0);
};


export const PrintInvoice = ({
  items = [],
  catalog,
  profile,
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
  const normalizedProfile = normalizeProfile(profile);
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath);
  const fallbackLetter = profileBrandInitial(normalizedProfile);
  const [failedLogoSrc, setFailedLogoSrc] = useState('');
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc;

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
  const title = isFactory ? normalizedProfile.invoiceTitleFactory : normalizedProfile.invoiceTitleCustomer;
  const totalArea = printableItems.reduce((sum, item) => sum + (resolveItemArea(item, catalog?.factoryLimits) ?? 0), 0);
  const hasInvoiceNotes = String(invoiceNotes || '').trim() !== '';
  const summaryItems = [
    { key: 'subTotal', label: 'جمع قبل از تخفیف', value: normalizedFinancials.subTotal.toLocaleString() },
    { key: 'itemDiscount', label: 'تخفیف سطری', value: normalizedFinancials.itemDiscountTotal.toLocaleString() },
    { key: 'invoiceDiscount', label: 'تخفیف فاکتور', value: normalizedFinancials.invoiceDiscountAmount.toLocaleString() },
    { key: 'tax', label: 'مالیات', value: normalizedFinancials.taxAmount.toLocaleString() },
    { key: 'area', label: 'متراژ', value: totalArea.toFixed(2), suffix: 'مترمربع', dir: 'ltr' },
    { key: 'paid', label: 'پرداخت‌شده', value: normalizedFinancials.paidTotal.toLocaleString() },
    { key: 'due', label: 'مانده', value: normalizedFinancials.dueAmount.toLocaleString() },
  ];

  const invoicePages = useMemo(() => {
    if (isFactory) {
      return paginateInvoiceItems(printableItems, {
        pageCapacityUnits: 12.2,
        lastPageCapacityUnits: 12.2,
      });
    }

    const summaryReserveUnits = 1.5
      + (normalizedPayments.length > 0 ? 1.0 : 0)
      + (hasInvoiceNotes ? 0.2 : 0);
    const pageCapacityUnits = DEFAULT_PAGE_CAPACITY_UNITS;
    const lastPageCapacityUnits = Math.max(3.2, pageCapacityUnits - summaryReserveUnits);

    return paginateInvoiceItems(printableItems, {
      pageCapacityUnits,
      lastPageCapacityUnits,
    });
  }, [printableItems, isFactory, normalizedPayments.length, hasInvoiceNotes]);

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
      {invoicePages.map((pageItems, pageIndex) => {
        const isLastMainPage = pageIndex === invoicePages.length - 1;
        const shouldBreakAfter = pageIndex < invoicePages.length - 1 || (isLastMainPage && includeAppendix && appendixEntries.length > 0);
        const rowStart = invoicePages.slice(0, pageIndex).reduce((sum, page) => sum + page.length, 0);

        return (
          <section
            key={`invoice-page-${pageIndex}`}
            className={`print-page invoice-main-page ${pageIndex > 0 ? 'invoice-main-page-continued' : ''} ${shouldBreakAfter ? 'print-page-break' : ''}`}
          >
            <div className="flex justify-between items-start border-b-[2px] border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl overflow-hidden">
                  {showLogo ? (
                    <img
                      src={logoSrc}
                      alt={normalizedProfile.brandName}
                      onError={() => setFailedLogoSrc(logoSrc)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    fallbackLetter
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">{normalizedProfile.brandName}</h1>
                  <p className="text-xs font-bold mt-1 text-slate-600">{title}</p>
                </div>
              </div>
              <div className="text-left text-xs font-bold space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[180px]">
                <div className="flex justify-between gap-4"><span className="text-slate-500">تاریخ:</span> <span>{toPN(date)}</span></div>
                {customerName && <div className="flex justify-between gap-4"><span className="text-slate-500">مشتری:</span> <span>{customerName}</span></div>}
                <div className="flex justify-between gap-4 border-t pt-1 mt-1"><span className="text-slate-500">کد رهگیری:</span> <span className="tabular-nums font-black tracking-wider text-[rgb(10,22,52)]" dir="ltr">{toPN(orderCode)}</span></div>
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
                  {!isFactory && <th className="border border-slate-300 p-2 w-28 text-center">مساحت (مترمربع)</th>}
                  {!isFactory && <th className="border border-slate-300 p-2 w-28 text-center">فی (مترمربع)</th>}
                  {!isFactory && <th className="border border-slate-300 p-2 w-32 text-left">مبلغ کل (تومان)</th>}
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {pageItems.map((item, i) => {
                  const itemType = String(item?.itemType || 'catalog');
                  const isManualLike = itemType === 'manual';
                  const width = isManualLike ? '-' : (item?.dimensions?.width ?? '-');
                  const height = isManualLike ? '-' : (item?.dimensions?.height ?? '-');
                  const count = itemType === 'manual'
                    ? (item?.manual?.qty ?? item?.dimensions?.count ?? 1)
                    : (item?.dimensions?.count ?? 1);
                  const itemArea = resolveItemArea(item, catalog?.factoryLimits);
                  const perSquareMeterPrice = resolvePerSquareMeterPrice(item, catalog?.roundStep, catalog?.factoryLimits);
                  const totalPrice = Math.max(0, Number(item?.totalPrice) || 0);

                  return (
                    <tr key={item.id || `page-${pageIndex}-row-${i}`} className="even:bg-slate-50/70 break-inside-avoid">
                      <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(rowStart + i + 1)}</td>
                      <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
                      <td className="border border-slate-300 p-2 align-top"><StructureDetails item={item} catalog={catalog} /></td>
                      <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(width)} × {toPN(height)}</td>
                      <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(count)}</td>
                      {!isFactory && (
                        <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top" dir="ltr">
                          {itemArea === null ? '-' : toPN(itemArea.toFixed(2))}
                        </td>
                      )}
                      {!isFactory && (
                        <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top">
                          {perSquareMeterPrice === null ? '-' : toPN(perSquareMeterPrice.toLocaleString())}
                        </td>
                      )}
                      {!isFactory && <td className="border border-slate-300 p-2 font-black tabular-nums bg-slate-100 text-left align-top text-[13px]">{toPN(totalPrice.toLocaleString())}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLastMainPage ? (
              <div className="invoice-main-lower-stack">
                {!isFactory && (
                  <div className="mb-3 break-inside-avoid">
                    <div className="invoice-summary-notes rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600">
                      <div className="mb-1 font-black text-slate-800">توضیحات و شرایط</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>تمامی ابعاد به سانتی‌متر ثبت شده‌اند.</span>
                        <span className="text-slate-300">|</span>
                        <span>اعتبار پیش‌فاکتور ۳ روز کاری است.</span>
                        <span className="text-slate-300">|</span>
                        <span>تمامی مبالغ به تومان است.</span>
                        {invoiceNotes && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="font-black text-slate-800">یادداشت:</span>
                            <span className="whitespace-pre-wrap">{invoiceNotes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isFactory && (
                  <div className="invoice-summary-bar mb-3 break-inside-avoid rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900">
                    <div className="invoice-summary-bar-header mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="text-[10px] font-black text-slate-600">جمع فاکتور</div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black ${paymentStatusMeta.className}`}>
                        {paymentStatusMeta.label}
                      </span>
                    </div>

                    <div className="invoice-summary-strip">
                      <div className="invoice-summary-strip-grid">
                        {summaryItems.map((item) => (
                          <div
                            key={item.key}
                            className={`invoice-summary-metric ${item.key === 'due' ? 'invoice-summary-metric-emphasis' : ''}`}
                          >
                            <div className="invoice-summary-metric-card">
                              <span className="invoice-summary-metric-label">{item.label}</span>
                              <span className="invoice-summary-metric-value" dir={item.dir || 'ltr'}>
                                {toPN(item.value)}
                                {item.suffix ? <span className="mr-1 text-[9px] font-normal text-slate-500">{item.suffix}</span> : null}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="invoice-summary-grand-total">
                        <div className="text-[10px] font-black text-slate-600">جمع کل فاکتور</div>
                        <div className="mt-1 text-[20px] font-black tabular-nums text-[rgb(var(--ui-accent-strong))]">
                          {toPN(normalizedFinancials.grandTotal.toLocaleString())}
                          <span className="mr-1 text-[10px] font-normal text-slate-500">تومان</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isFactory && normalizedPayments.length > 0 && (
                  <div className="mb-3 break-inside-avoid border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700">ریز پرداخت‌ها</div>
                    <table className="w-full text-xs">
                      <thead className="bg-white text-slate-500 border-y border-slate-200">
                        <tr>
                          <th className="p-2 text-right font-black">تاریخ</th>
                          <th className="p-2 text-right font-black">روش</th>
                          <th className="p-2 text-right font-black">رسید</th>
                          <th className="p-2 text-left font-black">مبلغ (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {normalizedPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="p-2 font-bold text-slate-600">{toPN(payment.date)}</td>
                            <td className="p-2 font-bold text-slate-700">{getPaymentMethodLabel(payment.method)}</td>
                            <td className="p-2 font-bold text-slate-500">{payment.receipt?.originalName || '-'}</td>
                            <td className="p-2 text-left font-black tabular-nums text-slate-900">{toPN(payment.amount.toLocaleString())}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="break-inside-avoid mb-0 pt-2 border-t border-slate-300 text-[10px] font-bold text-slate-600 flex flex-wrap items-center gap-2">
                  <span className="text-slate-800">آدرس کارخانه:</span>
                  <span>{normalizedProfile.address}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-800">شماره تماس:</span>
                  <span className="tabular-nums" dir="ltr">{normalizedProfile.phones}</span>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}

      {includeAppendix && appendixEntries.length > 0 && (
        <section className="print-page appendix-page">
          <div className="mb-3 flex items-end justify-between border-b-2 border-slate-800 pb-2">
            <div>
              <h2 className="text-base font-black text-slate-900">پیوست الگوها و خدمات انتخابی</h2>
              <p className="mt-0.5 text-[10px] font-bold text-slate-500">جزئیات هر ردیف در یک کارت فشرده.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
              {toPN(appendixEntries.length)} مورد
            </div>
          </div>

          <div className="appendix-grid grid grid-cols-1 gap-3">
            {appendixEntries.map((entry) => (
              <article key={entry.key} className="appendix-card break-inside-avoid rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-bold text-slate-700">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-white">ردیف {toPN(entry.rowNumber)}</span>
                  <span className="min-w-0 flex-1 text-sm font-black text-slate-800">{entry.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 tabular-nums" dir="ltr">
                    {toPN(entry.width)} × {toPN(entry.height)} | {toPN(entry.count)} عدد
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-2">
                    {entry.hasPattern ? (
                      <PatternPreview pattern={entry.pattern} width={entry.width} height={entry.height} />
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-[10px] font-bold text-slate-500">
                        برای این آیتم الگو ثبت نشده است.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-700">خدمات و جاساز انتخابی</div>
                    {entry.services.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {entry.services.map((service) => (
                          <OperationChip
                            key={`${entry.key}-${service.id}`}
                            title={service.title}
                            iconFile={service.iconFile}
                            qty={service.qty}
                            compact
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-[10px] font-bold text-slate-500">
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
