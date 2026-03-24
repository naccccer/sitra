import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Link2, Phone, PlusCircle, Save, Search, User } from 'lucide-react'

export const CheckoutModal = ({
  isOpen,
  isStaffContext = false,
  editingOrder,
  customerInfo,
  customerLinks = null,
  onCustomerInfoChange,
  onClose,
  onSubmit,
}) => {
  const [showLinkingTools, setShowLinkingTools] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')


  useEffect(() => {
    if (!isOpen) return
    setShowLinkingTools(false)
    setCustomerQuery('')
  }, [isOpen])
  if (!isOpen) return null

  const customers = Array.isArray(customerLinks?.customers) ? customerLinks.customers : []
  const projects = Array.isArray(customerLinks?.projects) ? customerLinks.projects : []
  const projectContacts = Array.isArray(customerLinks?.projectContacts) ? customerLinks.projectContacts : []

  const filteredCustomers = useMemo(() => {
    const query = String(customerQuery || '').trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => (
      String(customer?.fullName || '').toLowerCase().includes(query)
      || String(customer?.defaultPhone || '').toLowerCase().includes(query)
      || String(customer?.customerCode || '').toLowerCase().includes(query)
    ))
  }, [customerQuery, customers])

  return (
    <div className="print-hide fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-emerald-500 p-5 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <User size={32} />
          </div>
          <h3 className="text-lg font-black">{editingOrder ? 'تایید نهایی ویرایش' : 'اطلاعات سفارش‌دهنده'}</h3>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500"><User size={14} /> نام و نام خانوادگی / شرکت</label>
            <input type="text" value={customerInfo.name} onChange={(event) => onCustomerInfoChange('name', event.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 text-sm font-black outline-none transition-colors focus:border-emerald-400" placeholder="مثال: علی حسینی" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500"><Phone size={14} /> شماره موبایل</label>
            <input type="tel" value={customerInfo.phone} onChange={(event) => onCustomerInfoChange('phone', event.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 text-sm font-black outline-none transition-colors focus:border-emerald-400" placeholder="09123456789" dir="ltr" />
          </div>

          {isStaffContext && customerLinks ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5"
                onClick={() => setShowLinkingTools((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Link2 size={14} />
                  اتصال اختیاری به مشتری/پروژه
                </span>
                <ChevronDown size={16} className={`transition-transform ${showLinkingTools ? 'rotate-180' : ''}`} />
              </button>

              {showLinkingTools ? (
                <div className="space-y-2 border-t border-slate-200 p-3">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                      placeholder="جستجوی مشتری (نام، موبایل، کد)"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-3 pe-8 text-sm font-black text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={customerLinks.selectedCustomerId || ''} onChange={(event) => customerLinks.setSelectedCustomerId?.(event.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
                      <option value="">انتخاب مشتری</option>
                      {filteredCustomers.map((customer) => (
                        <option key={customer.id} value={String(customer.id)}>
                          {customer.fullName}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => void customerLinks.createQuickCustomer?.()} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700">
                      <PlusCircle size={12} />
                      جدید
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={customerLinks.selectedProjectId || ''} onChange={(event) => customerLinks.setSelectedProjectId?.(event.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700" disabled={!customerLinks.selectedCustomerId}>
                      <option value="">انتخاب پروژه</option>
                      {projects.map((project) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => void customerLinks.createQuickProject?.()} disabled={!customerLinks.selectedCustomerId} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 disabled:opacity-50">
                      <PlusCircle size={12} />
                      جدید
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={customerLinks.selectedProjectContactId || ''} onChange={(event) => customerLinks.setSelectedProjectContactId?.(event.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700" disabled={!customerLinks.selectedProjectId}>
                      <option value="">شماره پروژه</option>
                      {projectContacts.map((contact) => (
                        <option key={contact.id} value={String(contact.id)}>
                          {(contact.label ? `${contact.label} - ` : '') + contact.phone}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => void customerLinks.createQuickProjectContact?.()} disabled={!customerLinks.selectedProjectId} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 disabled:opacity-50">
                      <PlusCircle size={12} />
                      جدید
                    </button>
                    <button type="button" onClick={() => void customerLinks.editQuickCustomer?.()} disabled={!customerLinks.selectedCustomerId} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-50">
                      ویرایش مشتری
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-3.5 font-black text-slate-600 transition-colors hover:bg-slate-200">انصراف</button>
            <button onClick={onSubmit} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600">
              <Save size={18} />
              ثبت نهایی
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
