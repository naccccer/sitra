import React, { useState } from 'react'
import { CircleCheckBig, FolderOpen, Package2, Phone, ReceiptText, UserRound } from 'lucide-react'
import { Button, InlineAlert, ModalShell, UniversalState } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { toPersianDigits } from '@/modules/sales/components/customer/order-form/orderCustomerLinkDrafts'

const SummaryCard = ({ icon, label, value, tone = 'default' }) => {
  const Icon = icon
  return (
    <div className={`rounded-[var(--radius-2xl)] border px-3 py-3 ${tone === 'accent' ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))]/45' : 'border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/45'}`}>
      <div className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-[rgb(var(--ui-text))]">{value}</div>
    </div>
  )
}

export const CheckoutModal = ({
  isOpen,
  isStaffContext = false,
  editingOrder,
  customerInfo,
  customerLinks = null,
  orderItems = [],
  grandTotal = 0,
  onClose,
  onOpenCustomerLinkModal,
  onSubmit,
}) => {
  const [submitState, setSubmitState] = useState({ busy: false, error: '', result: null })
  const warningMessage = !isStaffContext || !customerLinks
    ? ''
    : !customerLinks.selectedCustomerId
      ? 'سفارش بدون اتصال به پرونده مشتری هم ثبت می‌شود، اما بازیابی و پیگیری آن سخت‌تر خواهد شد.'
      : !customerLinks.selectedProjectId
        ? 'اگر این سفارش مربوط به پروژه مشخصی است، بهتر است پیش از ثبت نهایی همان‌جا انتخاب شود.'
        : ''

  if (!isOpen) return null

  const handleSubmit = async () => {
    setSubmitState({ busy: true, error: '', result: null })
    const result = await onSubmit?.()
    if (result?.ok && result?.mode === 'create') {
      setSubmitState({ busy: false, error: '', result })
      return
    }
    if (result?.ok) {
      setSubmitState({ busy: false, error: '', result: null })
      onClose?.()
      return
    }
    setSubmitState({
      busy: false,
      error: result?.message || 'ثبت سفارش با خطا مواجه شد.',
      result: null,
    })
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title={editingOrder ? 'مرور و ثبت نهایی ویرایش سفارش' : 'مرور و ثبت نهایی سفارش'}
      description="اطلاعات سفارش‌دهنده، ارجاع پروژه، و جمع مبلغ اینجا فقط بازبینی می‌شود و دیگر نقطه ورود اصلی داده نیست."
      onClose={onClose}
      closeButtonMode="icon"
      maxWidthClass="max-w-4xl"
      footer={submitState.result ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>بازگشت به فرم</Button>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="quiet" onClick={onClose}>بازگشت برای تکمیل</Button>
            {isStaffContext ? (
              <Button variant="tertiary" onClick={() => { onClose?.(); onOpenCustomerLinkModal?.() }}>
                <FolderOpen size={14} />
                مشتری و پروژه
              </Button>
            ) : null}
          </div>
          <Button action="save" variant="primary" onClick={() => void handleSubmit()} loading={submitState.busy}>
            {editingOrder ? 'ثبت نهایی تغییرات' : 'ثبت سفارش'}
          </Button>
        </div>
      )}
    >
      {submitState.result ? (
        <div className="space-y-4">
          <UniversalState
            state="success"
            title={submitState.result.title}
            description={submitState.result.message}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryCard icon={CircleCheckBig} label="کد پیگیری" value={submitState.result.orderCode ? toPersianDigits(submitState.result.orderCode) : 'در انتظار تخصیص'} tone="accent" />
            <SummaryCard icon={ReceiptText} label="جمع مبلغ" value={`${toPN(Number(submitState.result.submittedTotal || 0).toLocaleString())} تومان`} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {submitState.error ? (
            <InlineAlert tone="danger" title="ثبت نهایی کامل نشد">
              {submitState.error}
            </InlineAlert>
          ) : null}

          {warningMessage ? (
            <InlineAlert tone="warning" title="ارجاع پروژه اختیاری است، اما پیشنهاد می‌شود">
              {warningMessage}
            </InlineAlert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <SummaryCard icon={UserRound} label="سفارش‌دهنده" value={customerInfo?.name?.trim() || 'ثبت نشده'} />
            <SummaryCard icon={Phone} label="شماره تماس" value={toPersianDigits(customerInfo?.phone || 'ثبت نشده')} />
            <SummaryCard icon={FolderOpen} label="پروژه" value={customerLinks?.selectedProject?.name || customerLinks?.selectedCustomer?.fullName || 'بدون ارجاع پرونده'} />
            <SummaryCard icon={Package2} label="آیتم‌های سفارش" value={`${toPN(orderItems.length)} آیتم`} tone="accent" />
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/45 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-black text-[rgb(var(--ui-text))]">جمع‌بندی ثبت</div>
                <div className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
                  {editingOrder ? 'ویرایش سفارش با همین ترکیب مشتری، پروژه، و آیتم‌ها ثبت می‌شود.' : 'پس از ثبت، فرم برای سفارش بعدی پاک می‌شود و کد پیگیری نمایش داده خواهد شد.'}
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--ui-accent-border))] bg-white px-4 py-3 text-sm font-black text-[rgb(var(--ui-text))]">
                {`${toPN(Number(grandTotal || 0).toLocaleString())} تومان`}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
