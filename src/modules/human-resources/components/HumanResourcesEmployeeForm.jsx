import { useState } from 'react'
import { Badge, Button, Card, Input } from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { toPN } from '@/utils/helpers'
import { displayName, normalizeNumericInput } from '../utils/humanResourcesView'

function Section({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-start"
        onClick={() => setOpen((current) => !current)}
      >
        <div>
          <div className="text-xs font-black text-slate-900">{title}</div>
          <div className="mt-1 text-[11px] font-bold text-slate-500">{description}</div>
        </div>
        <span className="mt-0.5 text-[11px] font-black text-slate-500">{open ? 'جمع کردن' : 'باز کردن'}</span>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

function Field({ label, required = false, children }) {
  return (
    <label className="space-y-1">
      <div className="text-[11px] font-black text-slate-600">
        {label}
        {required ? <span className="me-1 text-rose-500">*</span> : null}
      </div>
      {children}
    </label>
  )
}

export function HumanResourcesEmployeeForm({
  busyKey,
  canWriteEmployees,
  form,
  formError,
  selectedEmployee,
  onFormChange,
  onSubmitForm,
}) {
  const isEditing = Boolean(form.id)
  const activeRecord = selectedEmployee || form

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-slate-900">{isEditing ? 'پرونده پرسنل' : 'ثبت پرسنل جدید'}</div>
            <Badge tone="info">{isEditing ? 'در حال ویرایش' : 'آماده ثبت'}</Badge>
          </div>
          <div className="text-xs font-bold text-slate-500">
            {isEditing ? displayName(activeRecord) : 'کد پرسنلی هنگام ذخیره به‌صورت خودکار صادر می‌شود.'}
          </div>
        </div>
      </div>

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
          {formError}
        </div>
      ) : null}

      {canWriteEmployees ? (
        <form className="space-y-4" onSubmit={onSubmitForm}>
          <Section
            title="اطلاعات پایه"
            description="هویت اصلی رکورد پرسنلی. کد پرسنلی در زمان ذخیره به‌صورت خودکار ساخته می‌شود."
            defaultOpen
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="نام" required>
                <Input value={form.firstName} onChange={(event) => onFormChange('firstName', event.target.value)} placeholder="نام" />
              </Field>
              <Field label="نام خانوادگی" required>
                <Input value={form.lastName} onChange={(event) => onFormChange('lastName', event.target.value)} placeholder="نام خانوادگی" />
              </Field>
              <Field label="کد ملی">
                <Input value={toPN(form.nationalId || '')} onChange={(event) => onFormChange('nationalId', normalizeNumericInput(event.target.value))} placeholder="کد ملی" />
              </Field>
              <Field label="موبایل">
                <Input value={toPN(form.mobile || '')} onChange={(event) => onFormChange('mobile', normalizeNumericInput(event.target.value))} placeholder="موبایل" />
              </Field>
            </div>
          </Section>

          <Section title="اطلاعات سازمانی" description="جایگاه پرسنل در ساختار شرکت">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="واحد">
                <Input value={form.department} onChange={(event) => onFormChange('department', event.target.value)} placeholder="واحد" />
              </Field>
              <Field label="سمت">
                <Input value={form.jobTitle} onChange={(event) => onFormChange('jobTitle', event.target.value)} placeholder="سمت" />
              </Field>
            </div>
          </Section>

          <Section title="اطلاعات بانکی و حقوق" description="اطلاعات مورد نیاز برای مصرف در حقوق و دستمزد">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="نام بانک">
                <Input value={form.bankName} onChange={(event) => onFormChange('bankName', event.target.value)} placeholder="نام بانک" />
              </Field>
              <Field label="شماره حساب">
                <Input value={toPN(form.bankAccountNo || '')} onChange={(event) => onFormChange('bankAccountNo', normalizeNumericInput(event.target.value))} placeholder="شماره حساب" />
              </Field>
              <Field label="شماره شبا">
                <Input value={form.bankSheba} onChange={(event) => onFormChange('bankSheba', event.target.value)} placeholder="شماره شبا" />
              </Field>
              <Field label="حقوق پایه">
                <div className="h-10 rounded-lg border border-slate-200 bg-white px-1">
                  <PriceInput value={form.baseSalary} onChange={(value) => onFormChange('baseSalary', value)} placeholder="حقوق پایه" className="h-8 text-start text-slate-800" />
                </div>
              </Field>
            </div>
          </Section>

          <Section title="یادداشت" description="اطلاعات تکمیلی پرونده">
            <Field label="یادداشت">
              <textarea
                value={form.notes}
                onChange={(event) => onFormChange('notes', event.target.value)}
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="توضیحات"
              />
            </Field>
          </Section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busyKey !== ''}>
              {busyKey === 'save' ? 'در حال ذخیره...' : isEditing ? 'ذخیره تغییرات' : 'ایجاد پرسنل'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">
          برای ایجاد یا ویرایش پرسنل به دسترسی نوشتن منابع انسانی نیاز دارید.
        </div>
      )}
    </Card>
  )
}
