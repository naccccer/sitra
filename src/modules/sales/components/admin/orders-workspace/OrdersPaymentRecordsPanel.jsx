import React from 'react';
import { Link2, Trash2, Upload } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { PriceInput } from '@/components/shared/PriceInput';
import { resolveApiFileUrl } from '@/utils/url';
import { getPaymentMethodLabel, PAYMENT_METHOD_OPTIONS } from '@/modules/sales/domain/invoice';
import { formatPersianDate } from '@/modules/sales/components/admin/orders-workspace/ordersWorkspaceUtils';
import { Button, Input, Select } from '@/components/shared/ui';

export const OrdersPaymentRecordsPanel = ({
  activeTab,
  order,
  payments,
  paymentDraft,
  paymentTouched,
  paymentAmountValid,
  paymentEditDrafts,
  uploadingReceiptKey,
  defaultPaymentMethod,
  onDraftFieldChange,
  onDraftTouched,
  onAddPayment,
  onBeginEdit,
  onEditFieldChange,
  onCancelEdit,
  onSaveEdit,
  onRemovePayment,
  onUploadDraftReceipt,
  onUploadEditedReceipt,
}) => {
  if (!order) return null;
  if (activeTab !== 'create' && activeTab !== 'list') return null;

  const orderEditDrafts = paymentEditDrafts?.[order.id] || {};

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <h4 className="text-xs font-black text-slate-800">
        {activeTab === 'create' ? 'ثبت پرداخت جدید' : 'پرداخت‌های ثبت‌شده'}
      </h4>

      {activeTab === 'create' && (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600">تاریخ</label>
              <Input type="text" value={paymentDraft.date} onChange={(event) => onDraftFieldChange('date', event.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600">مبلغ (تومان)</label>
              <div className="h-9 w-full rounded-lg border border-slate-200 bg-white">
                <PriceInput
                  value={paymentDraft.amount}
                  onChange={(value) => {
                    onDraftFieldChange('amount', value);
                    onDraftTouched(true);
                  }}
                  placeholder="0"
                />
              </div>
              {paymentTouched && !paymentAmountValid && (
                <div className="text-[10px] font-bold text-rose-600">مبلغ باید بیشتر از صفر باشد.</div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600">روش پرداخت</label>
              <Select value={paymentDraft.method} onChange={(event) => onDraftFieldChange('method', event.target.value)} className="h-9 text-xs">
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600">یادداشت</label>
              <Input type="text" value={paymentDraft.note} onChange={(event) => onDraftFieldChange('note', event.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600">رسید واریزی (اختیاری)</label>
              <div className="flex gap-1.5">
                <label htmlFor={`payment-receipt-${order.id}`} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2 text-[10px] font-black text-slate-700 hover:bg-slate-200">
                  <Upload size={12} />
                  {uploadingReceiptKey === `draft:${order.id}` ? 'در حال آپلود...' : 'آپلود رسید'}
                </label>
                <input
                  id={`payment-receipt-${order.id}`}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onUploadDraftReceipt(file);
                    event.target.value = '';
                  }}
                />
                {paymentDraft.receipt?.filePath && (
                  <Button onClick={() => onDraftFieldChange('receipt', null)} size="sm" variant="danger">حذف</Button>
                )}
              </div>
              {paymentDraft.receipt?.originalName && (
                <div className="truncate text-[10px] font-bold text-slate-500">{paymentDraft.receipt.originalName}</div>
              )}
            </div>
          </div>
          <Button onClick={onAddPayment} disabled={!paymentAmountValid} variant="primary">افزودن پرداخت</Button>
        </>
      )}

      {activeTab === 'list' && (
        payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs font-bold text-slate-500">هنوز پرداختی ثبت نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead className="border-y border-slate-200 bg-white text-slate-500">
                <tr>
                  <th className="p-2 text-right font-black">تاریخ</th>
                  <th className="p-2 text-right font-black">روش</th>
                  <th className="p-2 text-right font-black">یادداشت</th>
                  <th className="p-2 text-right font-black">رسید</th>
                  <th className="p-2 text-left font-black">مبلغ</th>
                  <th className="p-2 text-center font-black">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => {
                  const rowDraft = orderEditDrafts[payment.id];
                  const isEditing = Boolean(rowDraft);
                  const rowAmountValid = Number(rowDraft?.amount) > 0;
                  return (
                    <tr key={payment.id}>
                      <td className="p-2">{isEditing ? <Input type="text" value={rowDraft.date || ''} onChange={(event) => onEditFieldChange(payment.id, 'date', event.target.value)} className="h-8 text-[11px]" /> : <span className="font-bold text-slate-700">{formatPersianDate(payment.date)}</span>}</td>
                      <td className="p-2">{isEditing ? <Select value={rowDraft.method || defaultPaymentMethod} onChange={(event) => onEditFieldChange(payment.id, 'method', event.target.value)} className="h-8 text-[11px]">{PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : <span className="font-bold text-slate-700">{getPaymentMethodLabel(payment.method)}</span>}</td>
                      <td className="p-2">{isEditing ? <Input type="text" value={rowDraft.note || ''} onChange={(event) => onEditFieldChange(payment.id, 'note', event.target.value)} className="h-8 text-[11px]" /> : <span className="font-bold text-slate-500">{payment.note || '-'}</span>}</td>
                      <td className="p-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <label htmlFor={`edit-receipt-${order.id}-${payment.id}`} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 text-[10px] font-black text-slate-700">
                              <Upload size={11} />
                              {uploadingReceiptKey === `edit:${order.id}:${payment.id}` ? 'در حال آپلود...' : 'آپلود'}
                            </label>
                            <input
                              id={`edit-receipt-${order.id}-${payment.id}`}
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                onUploadEditedReceipt(payment.id, file);
                                event.target.value = '';
                              }}
                            />
                            {rowDraft.receipt?.filePath && <Button onClick={() => onEditFieldChange(payment.id, 'receipt', null)} size="sm" variant="danger">حذف</Button>}
                          </div>
                        ) : payment.receipt?.filePath ? (
                          <a href={resolveApiFileUrl(payment.receipt.filePath)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-blue-700 hover:text-blue-800">
                            <Link2 size={12} />
                            {payment.receipt.originalName || 'مشاهده'}
                          </a>
                        ) : <span className="font-bold text-slate-400">-</span>}
                      </td>
                      <td className="p-2 text-left font-black tabular-nums text-slate-900">{isEditing ? <div className="h-8 w-24 rounded-lg border border-slate-200 bg-white"><PriceInput value={rowDraft.amount ?? ''} onChange={(value) => onEditFieldChange(payment.id, 'amount', value)} placeholder="0" /></div> : toPN(payment.amount.toLocaleString())}</td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <Button onClick={() => onSaveEdit(payment.id)} disabled={!rowAmountValid} size="sm" variant="success">ذخیره</Button>
                              <Button onClick={() => onCancelEdit(payment.id)} size="sm" variant="secondary">انصراف</Button>
                            </>
                          ) : (
                            <>
                              <Button onClick={() => onBeginEdit(payment)} size="sm" variant="secondary">ویرایش</Button>
                              <Button onClick={() => onRemovePayment(payment.id)} size="sm" variant="danger">
                                <Trash2 size={11} />
                                حذف
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
