import React, { useState } from 'react'
import { Building2, CircleAlert, FolderOpen, Phone, Search, UserRound } from 'lucide-react'
import { Button, InlineAlert, Input, ModalShell, Select, Tooltip } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { OrderCustomerLinkEditor } from '@/modules/sales/components/customer/order-form/OrderCustomerLinkEditor'
import { OrderCustomerSnapshotSection } from '@/modules/sales/components/customer/order-form/OrderCustomerSnapshotSection'
import {
  createContactLinkDraft,
  createCustomerLinkDraft,
  createProjectLinkDraft,
  normalizeSearch,
  toPersianDigits,
  validateContactLinkDraft,
  validateCustomerLinkDraft,
  validateProjectLinkDraft,
} from '@/modules/sales/components/customer/order-form/orderCustomerLinkDrafts'
const summaryValue = (value, fallback = 'ثبت نشده') => String(value || '').trim() || fallback
const SummaryRow = ({ icon, label, value }) => {
  const Icon = icon
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--ui-border-soft))] bg-white/92 px-3 py-2.5">
      <div className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">
        <Icon size={14} />
        {label}
      </div>
      <div className="text-sm font-black text-[rgb(var(--ui-text))]">{value}</div>
    </div>
  )
}

export const OrderCustomerLinkModal = ({
  isOpen,
  onClose,
  customerInfo,
  onCustomerInfoChange,
  customerLinks,
}) => {
  const [customerQuery, setCustomerQuery] = useState('')
  const [editorMode, setEditorMode] = useState('')
  const [formError, setFormError] = useState('')
  const [customerDraft, setCustomerDraft] = useState(() => createCustomerLinkDraft(customerLinks?.selectedCustomer, customerInfo))
  const [projectDraft, setProjectDraft] = useState(() => createProjectLinkDraft(customerLinks?.selectedProject))
  const [contactDraft, setContactDraft] = useState(() => createContactLinkDraft(customerLinks?.selectedContact, customerInfo))
  const filteredCustomers = (() => {
    const list = Array.isArray(customerLinks?.customers) ? customerLinks.customers : []
    const query = normalizeSearch(customerQuery)
    if (!query) {
      const sampled = list.slice(0, 14)
      const selected = customerLinks?.selectedCustomer
      if (selected && !sampled.some((item) => String(item.id) === String(selected.id))) {
        return [selected, ...sampled].slice(0, 14)
      }
      return sampled
    }
    return list.filter((customer) => {
      const haystack = [
        customer?.fullName,
        customer?.defaultPhone,
        customer?.customerCode,
      ].map(normalizeSearch)
      return haystack.some((value) => value.includes(query))
    }).slice(0, 24)
  })()
  const handleOpenEditor = (mode) => {
    customerLinks?.setError?.('')
    setFormError('')
    setEditorMode(mode)
    if (mode === 'createCustomer') setCustomerDraft(createCustomerLinkDraft(null, customerInfo))
    if (mode === 'editCustomer') setCustomerDraft(createCustomerLinkDraft(customerLinks?.selectedCustomer, customerInfo))
    if (mode === 'createProject') setProjectDraft(createProjectLinkDraft())
    if (mode === 'createContact') setContactDraft(createContactLinkDraft(null, customerInfo))
  }
  const handleSubmitEditor = async () => {
    try {
      if (editorMode === 'createCustomer' || editorMode === 'editCustomer') {
        const validationError = validateCustomerLinkDraft(customerDraft)
        if (validationError) {
          setFormError(validationError)
          return
        }
        const payload = {
          ...(editorMode === 'editCustomer' ? { id: Number(customerLinks?.selectedCustomerId || 0) } : {}),
          fullName: customerDraft.fullName,
          defaultPhone: customerDraft.defaultPhone,
          applyToOrderHistory: Boolean(customerDraft.applyToOrderHistory),
        }
        if (editorMode === 'editCustomer') await customerLinks?.updateCustomer?.(payload)
        else await customerLinks?.createCustomer?.(payload)
      }

      if (editorMode === 'createProject') {
        const validationError = validateProjectLinkDraft(projectDraft)
        if (validationError) {
          setFormError(validationError)
          return
        }
        await customerLinks?.createProject?.({
          customerId: Number(customerLinks?.selectedCustomerId || 0),
          name: projectDraft.name,
          notes: projectDraft.notes,
          isDefault: Boolean(projectDraft.isDefault),
        })
      }

      if (editorMode === 'createContact') {
        const validationError = validateContactLinkDraft(contactDraft)
        if (validationError) {
          setFormError(validationError)
          return
        }
        await customerLinks?.createProjectContact?.({
          projectId: Number(customerLinks?.selectedProjectId || 0),
          label: contactDraft.label,
          phone: contactDraft.phone,
          isPrimary: Boolean(contactDraft.isPrimary),
        })
      }

      setFormError('')
      setEditorMode('')
    } catch {
      // The hook already stores the server error for the shared alert surface.
    }
  }
  const handleClose = () => {
    setEditorMode('')
    setFormError('')
    customerLinks?.setError?.('')
    onClose?.()
  }
  const selectionHint = !customerLinks?.selectedCustomerId
    ? 'برای کاهش اصلاحات انتهایی، مشتری را همین‌جا انتخاب یا ثبت کنید.'
    : !customerLinks?.selectedProjectId
      ? 'اگر سفارش به پروژه مشخصی تعلق دارد، پروژه را هم پیش از ثبت نهایی تعیین کنید.'
      : ''

  return (
    <ModalShell
      isOpen={isOpen}
      title="مدیریت مشتری و پروژه سفارش"
      description="هم اطلاعات سفارش‌دهنده را کامل کنید، هم پرونده و پروژه را بدون خروج از فرم انتخاب یا بسازید."
      onClose={handleClose}
      closeButtonMode="icon"
      maxWidthClass="max-w-[72rem]"
      bodyClassName="max-h-[84vh] space-y-5 bg-[rgb(var(--ui-surface-muted))]/35 p-5"
    >
      <div className="space-y-4">
        <OrderCustomerSnapshotSection customerInfo={customerInfo} onCustomerInfoChange={onCustomerInfoChange} />

        {customerLinks?.error ? (
          <InlineAlert tone="danger" title="همگام‌سازی ناموفق بود" actions={<Button variant="quiet" size="sm" onClick={() => customerLinks.setError('')}>بستن</Button>}>
            {customerLinks.error}
          </InlineAlert>
        ) : null}
        {selectionHint ? (
          <InlineAlert tone="warning" title="ارجاع پرونده هنوز کامل نیست">
            {selectionHint}
          </InlineAlert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-3 rounded-[var(--radius-3xl)] border border-[rgb(var(--ui-border-soft))] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-black text-[rgb(var(--ui-text))]">جست‌وجوی مشتری</div>
                <Tooltip content="جست‌وجو با نام، تلفن پیش‌فرض، یا کد مشتری انجام می‌شود." side="bottom-right">
                  <span tabIndex={0} role="img" aria-label="راهنما" className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full text-[rgb(var(--ui-text-muted))]">
                    <CircleAlert size={14} />
                  </span>
                </Tooltip>
              </div>
              <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">
                {customerQuery.trim() ? `${toPN(filteredCustomers.length)} نتیجه` : '۱۴ نتیجه نخست'}
              </div>
            </div>
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))]" />
              <Input
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder="نام مشتری، تلفن، یا کد مشتری"
                className="ps-3 pe-9"
              />
            </label>
            <div className="max-h-[24rem] space-y-2 overflow-y-auto pe-1">
              {customerLinks?.loadingCustomers ? (
                <div className="rounded-3xl border border-dashed border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))]/35 px-4 py-8 text-center text-sm font-bold text-[rgb(var(--ui-text-muted))]">
                  فهرست مشتریان در حال آماده‌سازی است...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))]/35 px-4 py-8 text-center text-sm font-bold text-[rgb(var(--ui-text-muted))]">
                  نتیجه‌ای پیدا نشد. مشتری جدید را از همین پنجره ثبت کنید.
                </div>
              ) : filteredCustomers.map((customer) => {
                const isSelected = String(customerLinks?.selectedCustomerId || '') === String(customer.id)
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => customerLinks?.setSelectedCustomerId?.(customer.id)}
                    className={`w-full rounded-3xl border px-3 py-3 text-start transition ${isSelected ? 'border-[rgb(var(--ui-primary))] bg-[rgb(var(--ui-accent-muted))]/35 shadow-[var(--shadow-soft)]' : 'border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-surface-muted))]/18 hover:border-[rgb(var(--ui-accent-border))] hover:bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-[rgb(var(--ui-text))]">{summaryValue(customer.fullName, `مشتری ${toPN(customer.id)}`)}</div>
                        <div className="mt-1 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">
                          {summaryValue(customer.customerCode, `کد ${toPN(customer.id)}`)}
                          {customer.defaultPhone ? ` · ${toPersianDigits(customer.defaultPhone)}` : ''}
                        </div>
                      </div>
                      {isSelected ? <span className="rounded-full bg-[rgb(var(--ui-accent-muted))] px-2 py-1 text-[11px] font-black text-[rgb(var(--ui-accent-strong))]">انتخاب‌شده</span> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-[var(--radius-3xl)] border border-[rgb(var(--ui-border-soft))] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
            <div className="space-y-2">
              <div className="text-sm font-black text-[rgb(var(--ui-text))]">پرونده انتخاب‌شده</div>
              <SummaryRow icon={UserRound} label="مشتری سفارش" value={summaryValue(customerLinks?.selectedCustomer?.fullName)} />
              <SummaryRow icon={Building2} label="پروژه" value={summaryValue(customerLinks?.selectedProject?.name)} />
              <SummaryRow icon={Phone} label="شماره پروژه" value={summaryValue(toPersianDigits(customerLinks?.selectedContact?.phone || customerInfo?.phone))} />
            </div>
            <div className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">پروژه</span>
                <Select
                  value={customerLinks?.selectedProjectId || ''}
                  onChange={(event) => customerLinks?.setSelectedProjectId?.(event.target.value)}
                  disabled={!customerLinks?.selectedCustomerId || customerLinks?.loadingProjects}
                >
                  <option value="">بدون پروژه</option>
                  {(customerLinks?.projects || []).map((project) => (
                    <option key={project.id} value={String(project.id)}>{project.name}</option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">شماره پروژه</span>
                <Select
                  value={customerLinks?.selectedProjectContactId || ''}
                  onChange={(event) => customerLinks?.setSelectedProjectContactId?.(event.target.value)}
                  disabled={!customerLinks?.selectedProjectId || customerLinks?.loadingProjectContacts}
                >
                  <option value="">بدون شماره پروژه</option>
                  {(customerLinks?.projectContacts || []).map((contact) => (
                    <option key={contact.id} value={String(contact.id)}>
                      {`${contact.label ? `${contact.label} · ` : ''}${toPersianDigits(contact.phone)}`}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleOpenEditor('createCustomer')}>مشتری جدید</Button>
              <Button variant="tertiary" size="sm" onClick={() => handleOpenEditor('editCustomer')} disabled={!customerLinks?.selectedCustomerId}>ویرایش مشتری</Button>
              <Button variant="tertiary" size="sm" onClick={() => handleOpenEditor('createProject')} disabled={!customerLinks?.selectedCustomerId}>پروژه جدید</Button>
              <Button variant="tertiary" size="sm" onClick={() => handleOpenEditor('createContact')} disabled={!customerLinks?.selectedProjectId}>شماره پروژه</Button>
            </div>

            {editorMode ? (
              <OrderCustomerLinkEditor
                editorMode={editorMode}
                customerDraft={customerDraft}
                setCustomerDraft={setCustomerDraft}
                projectDraft={projectDraft}
                setProjectDraft={setProjectDraft}
                contactDraft={contactDraft}
                setContactDraft={setContactDraft}
                formError={formError}
                isMutating={Boolean(customerLinks?.isMutating)}
                onCancel={() => { setEditorMode(''); setFormError('') }}
                onSubmit={() => void handleSubmitEditor()}
              />
            ) : null}
          </section>
        </div>
      </div>
    </ModalShell>
  )
}
