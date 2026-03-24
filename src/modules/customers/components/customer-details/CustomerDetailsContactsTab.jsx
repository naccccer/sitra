import { Badge, Button, Card, EmptyState, Input, Select } from '@/components/shared/ui'
import { createContactDraft } from '../../utils/customersView'

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

export const CustomerDetailsContactsTab = ({
  projects = [],
  contacts = [],
  isLoadingContacts = false,
  selectedProjectId = '',
  setSelectedProjectId = () => {},
  contactDraft,
  setContactDraft,
  canWriteCustomers = false,
  resetContactDraft,
  handleSaveContact,
  handleDeleteContact,
}) => (
  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.05fr]">
    <Card tone="muted" padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-900">شماره‌های پروژه</div>
      <Select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
        <option value="">انتخاب پروژه</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </Select>
      {isLoadingContacts ? (
        <div className="text-xs font-bold text-slate-500">در حال بارگذاری...</div>
      ) : contacts.length === 0 ? (
        <EmptyState title="شماره‌ای یافت نشد" description="برای پروژه انتخاب‌شده شماره جدید ثبت کنید." />
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => {
                setContactDraft(createContactDraft(contact, selectedProjectId))
                setSelectedProjectId(String(contact.projectId || selectedProjectId))
              }}
              className={`w-full rounded-2xl border bg-white px-3 py-3 text-start transition-colors ${contactDraft.id === String(contact.id) ? 'border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-900">{contact.label || 'اصلی'}</div>
                <span className="text-[11px] font-bold text-slate-400">برای ویرایش انتخاب کنید</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                <span>{toPersianDigits(contact.phone)}</span>
                <span>{contact.isPrimary ? 'اصلی' : 'فرعی'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>

    <Card tone="muted" padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-900">{contactDraft.id ? 'ویرایش شماره' : 'افزودن شماره'}</div>
      {contactDraft.id ? (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
          درحال ویرایش: {contactDraft.phone || 'شماره تماس'}
        </div>
      ) : null}
      <Input value={contactDraft.label} onChange={(event) => setContactDraft((prev) => ({ ...prev, label: event.target.value }))} placeholder="برچسب" disabled={!canWriteCustomers} />
      <Input value={toPersianDigits(contactDraft.phone)} onChange={(event) => setContactDraft((prev) => ({ ...prev, phone: toEnglishDigits(event.target.value) }))} placeholder="شماره تماس" inputMode="tel" disabled={!canWriteCustomers} />
      <Input value={toPersianDigits(contactDraft.sortOrder)} onChange={(event) => setContactDraft((prev) => ({ ...prev, sortOrder: toEnglishDigits(event.target.value) }))} placeholder="ترتیب نمایش" inputMode="numeric" disabled={!canWriteCustomers} />
      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
        <input type="checkbox" checked={Boolean(contactDraft.isPrimary)} onChange={(event) => setContactDraft((prev) => ({ ...prev, isPrimary: event.target.checked }))} disabled={!canWriteCustomers} />
        شماره اصلی
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={handleSaveContact} disabled={!canWriteCustomers}>{contactDraft.id ? 'ذخیره تغییرات' : 'ثبت شماره'}</Button>
        {contactDraft.id && canWriteCustomers ? <Button variant="secondary" onClick={() => resetContactDraft(null, selectedProjectId)}>شماره جدید</Button> : null}
        {contactDraft.id && canWriteCustomers ? (
          <Button variant="danger" onClick={() => handleDeleteContact(contactDraft)}>
            حذف شماره
          </Button>
        ) : null}
      </div>
      {!canWriteCustomers ? <div className="text-[11px] font-bold text-slate-500">فقط دسترسی مشاهده دارید.</div> : null}
    </Card>
  </div>
)
