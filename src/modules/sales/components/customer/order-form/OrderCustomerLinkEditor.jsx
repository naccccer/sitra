import React from 'react'
import { Button, InlineAlert, Input } from '@/components/shared/ui'
import { toEnglishDigits, toPersianDigits } from '@/modules/sales/components/customer/order-form/orderCustomerLinkDrafts'

const EDITOR_META = {
  createCustomer: { title: 'مشتری جدید', cta: 'ثبت مشتری' },
  editCustomer: { title: 'ویرایش مشتری', cta: 'ذخیره تغییرات مشتری' },
  createProject: { title: 'پروژه جدید', cta: 'ثبت پروژه' },
  createContact: { title: 'شماره پروژه', cta: 'ثبت شماره پروژه' },
}

export const OrderCustomerLinkEditor = ({
  editorMode,
  customerDraft,
  setCustomerDraft,
  projectDraft,
  setProjectDraft,
  contactDraft,
  setContactDraft,
  formError,
  isMutating = false,
  onCancel,
  onSubmit,
}) => (
  <div className="space-y-3 rounded-[var(--radius-2xl)] border border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))]/35 p-4">
    <div className="text-sm font-black text-[rgb(var(--ui-text))]">{EDITOR_META[editorMode]?.title}</div>
    {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}

    {(editorMode === 'createCustomer' || editorMode === 'editCustomer') ? (
      <>
        <Input value={customerDraft.fullName} onChange={(event) => setCustomerDraft((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="نام مشتری" />
        <Input value={toPersianDigits(customerDraft.defaultPhone)} onChange={(event) => setCustomerDraft((prev) => ({ ...prev, defaultPhone: toEnglishDigits(event.target.value) }))} placeholder="تلفن پیش‌فرض" inputMode="tel" dir="ltr" />
        {editorMode === 'editCustomer' ? (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
            <input type="checkbox" checked={Boolean(customerDraft.applyToOrderHistory)} onChange={(event) => setCustomerDraft((prev) => ({ ...prev, applyToOrderHistory: event.target.checked }))} />
            اعمال روی سفارش‌های قبلی همین مشتری
          </label>
        ) : null}
      </>
    ) : null}

    {editorMode === 'createProject' ? (
      <>
        <Input value={projectDraft.name} onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="نام پروژه" />
        <Input value={projectDraft.notes} onChange={(event) => setProjectDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="یادداشت پروژه" />
        <label className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
          <input type="checkbox" checked={Boolean(projectDraft.isDefault)} onChange={(event) => setProjectDraft((prev) => ({ ...prev, isDefault: event.target.checked }))} />
          این پروژه پیش‌فرض شود
        </label>
      </>
    ) : null}

    {editorMode === 'createContact' ? (
      <>
        <Input value={contactDraft.label} onChange={(event) => setContactDraft((prev) => ({ ...prev, label: event.target.value }))} placeholder="برچسب شماره پروژه" />
        <Input value={toPersianDigits(contactDraft.phone)} onChange={(event) => setContactDraft((prev) => ({ ...prev, phone: toEnglishDigits(event.target.value) }))} placeholder="شماره تماس پروژه" inputMode="tel" dir="ltr" />
        <label className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
          <input type="checkbox" checked={Boolean(contactDraft.isPrimary)} onChange={(event) => setContactDraft((prev) => ({ ...prev, isPrimary: event.target.checked }))} />
          شماره اصلی پروژه
        </label>
      </>
    ) : null}

    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="quiet" size="sm" onClick={onCancel}>انصراف</Button>
      <Button variant="primary" size="sm" onClick={onSubmit} loading={isMutating}>
        {EDITOR_META[editorMode]?.cta}
      </Button>
    </div>
  </div>
)
