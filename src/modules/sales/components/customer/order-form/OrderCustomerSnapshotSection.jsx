import React from 'react'
import { Phone, Sparkles, UserRound } from 'lucide-react'
import { Input } from '@/components/shared/ui'
import { toEnglishDigits, toPersianDigits } from '@/modules/sales/components/customer/order-form/orderCustomerLinkDrafts'

const StatusRow = ({ icon, label, ready }) => {
  const Icon = icon
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--ui-border-soft))] bg-white/92 px-3 py-2.5">
      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
        <Icon size={13} />
        {label}
      </div>
      <div className="text-sm font-black text-[rgb(var(--ui-text))]">{ready ? 'کامل شده' : 'نیاز به تکمیل'}</div>
    </div>
  )
}

export const OrderCustomerSnapshotSection = ({
  customerInfo,
  onCustomerInfoChange,
}) => {
  const nameReady = String(customerInfo?.name || '').trim() !== ''
  const phoneReady = String(customerInfo?.phone || '').trim() !== ''

  return (
    <section className="rounded-[var(--radius-3xl)] border border-[rgb(var(--ui-border-soft))] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))]">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-black text-[rgb(var(--ui-text))]">اطلاعات سفارش‌دهنده</div>
              <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">این بخش را همین‌جا کامل کنید تا در پنجره نهایی فقط مرور انجام شود.</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
                <UserRound size={14} />
                نام سفارش‌دهنده
              </span>
              <Input value={customerInfo?.name || ''} onChange={(event) => onCustomerInfoChange('name', event.target.value)} placeholder="نام و نام خانوادگی یا شرکت" />
            </label>
            <label className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
                <Phone size={14} />
                شماره تماس
              </span>
              <Input value={toPersianDigits(customerInfo?.phone || '')} onChange={(event) => onCustomerInfoChange('phone', toEnglishDigits(event.target.value))} placeholder="شماره تماس سفارش‌دهنده" inputMode="tel" dir="ltr" />
            </label>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[18rem] lg:grid-cols-1">
          <StatusRow icon={UserRound} label="وضعیت نام" ready={nameReady} />
          <StatusRow icon={Phone} label="وضعیت تماس" ready={phoneReady} />
        </div>
      </div>
    </section>
  )
}
