import { useMemo, useState } from 'react'
import { ChevronDown, ClipboardList, Phone, Plus, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input } from '@/components/shared/ui'
import { formatAmount, toPN } from '../../utils/customersView'

const toEnglishDigits = (value) => String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
const toPersianDigits = (value) => String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] || digit)

const projectSummaryCards = (project) => [
  { label: 'سفارش', value: toPN(project?.financialSummary?.ordersCount || 0) },
  { label: 'جمع', value: formatAmount(project?.financialSummary?.totalAmount || 0) },
  { label: 'پرداخت‌شده', value: formatAmount(project?.financialSummary?.paidAmount || 0) },
  { label: 'مانده', value: formatAmount(project?.financialSummary?.dueAmount || 0) },
]

const normalizeSearch = (value) => String(value ?? '').trim().toLowerCase()
export const CustomerDetailsProjectsTab = ({
  customerOptions = [],
  projects = [],
  isLoadingProjects = false,
  selectedProjectId = '',
  projectDraft,
  setProjectDraft,
  projectPhoneDraft = '',
  setProjectPhoneDraft = () => {},
  canWriteCustomers = false,
  resetProjectDraft,
  handleSaveProject,
  handleDeleteProject,
}) => {
  const [showTransferPanel, setShowTransferPanel] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')

  const activeCustomerOptions = useMemo(
    () => customerOptions.filter((customer) => customer?.isActive !== false),
    [customerOptions],
  )

  const recentCustomerOptions = useMemo(
    () => [...activeCustomerOptions].sort((left, right) => {
      const leftTime = Date.parse(left?.updatedAt || left?.createdAt || '') || 0
      const rightTime = Date.parse(right?.updatedAt || right?.createdAt || '') || 0
      if (leftTime !== rightTime) return rightTime - leftTime
      return Number(right?.id || 0) - Number(left?.id || 0)
    }).slice(0, 2),
    [activeCustomerOptions],
  )

  const filteredCustomerOptions = useMemo(() => {
    const query = normalizeSearch(customerQuery)
    if (!query) return recentCustomerOptions
    return activeCustomerOptions.filter((customer) => {
      const fullName = normalizeSearch(customer.fullName)
      const customerCode = normalizeSearch(customer.customerCode)
      const phone = normalizeSearch(customer.defaultPhone)
      return fullName.includes(query) || customerCode.includes(query) || phone.includes(query)
    })
  }, [activeCustomerOptions, customerQuery, recentCustomerOptions])

  const selectedCustomer = activeCustomerOptions.find((customer) => String(customer.id) === String(projectDraft.targetCustomerId || '')) || null

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card tone="muted" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              پروژه‌ها
            </div>
          </div>
          {canWriteCustomers ? (
            <Button variant="secondary" size="sm" onClick={() => resetProjectDraft(null)}>
              <Plus className="h-4 w-4" />
              پروژه جدید
            </Button>
          ) : null}
        </div>

        {isLoadingProjects ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-xs font-bold text-slate-500">
            در حال بارگذاری...
          </div>
        ) : projects.length === 0 ? (
          <EmptyState title="پروژه‌ای یافت نشد" description="از فرم سمت چپ یک پروژه جدید بسازید." action={canWriteCustomers ? <Button variant="secondary" onClick={() => resetProjectDraft(null)}>پروژه جدید</Button> : null} />
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const isSelected = selectedProjectId === String(project.id)
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => resetProjectDraft(project)}
                  className={`w-full rounded-2xl border p-3 text-start transition-all ${isSelected ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white/85 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-900">{project.name}</div>
                        {project.isDefault ? <Badge tone="info">پیش‌فرض</Badge> : null}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-slate-500">
                        {project.notes || 'یادداشت ثبت نشده'}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">برای ویرایش انتخاب کنید</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {projectSummaryCards(project).map((item) => (
                      <div key={item.label} className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="text-[10px] font-bold text-slate-500">{item.label}</div>
                        <div className="mt-1 text-xs font-black text-slate-900">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <Card tone="muted" padding="md" className="space-y-4">
        <div>
          <div className="text-sm font-black text-slate-900">{projectDraft.id ? 'ویرایش پروژه' : 'ایجاد پروژه'}</div>
        </div>

        {projectDraft.id ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
            در حال ویرایش: {projectDraft.name || 'پروژه'}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3">
          <Input
            value={projectDraft.name}
            onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="نام پروژه"
            disabled={!canWriteCustomers}
          />
          <Input
            value={projectDraft.notes}
            onChange={(event) => setProjectDraft((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="توضیحات پروژه"
            disabled={!canWriteCustomers}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-600">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="shrink-0">شماره تماس پروژه</span>
            <Input className="h-8 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" value={toPersianDigits(projectPhoneDraft)} onChange={(event) => setProjectPhoneDraft(toEnglishDigits(event.target.value))} placeholder="شماره تماس" inputMode="tel" disabled={!canWriteCustomers} />
          </label>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-start"
              onClick={() => setShowTransferPanel((prev) => !prev)}
            >
              <div>
                <div className="text-sm font-black text-slate-900">جابه‌جایی پروژه</div>
                <div className="mt-1 text-[11px] font-bold text-slate-500">
                  انتقال را فقط وقتی لازم دارید باز کنید.
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showTransferPanel ? 'rotate-180' : ''}`} />
            </button>

            {showTransferPanel ? (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <Input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder={selectedCustomer ? 'تغییر مشتری مقصد' : 'جستجو و انتخاب مشتری مقصد'}
                  disabled={!canWriteCustomers}
                />
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    <div className="min-w-0">
                      <div className="text-[11px] text-emerald-700">مشتری مقصد انتخاب‌شده</div>
                      <div className="truncate font-black">{selectedCustomer.fullName || `مشتری ${toPersianDigits(selectedCustomer.id)}`}</div>
                    </div>
                    {canWriteCustomers ? (
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600"
                        onClick={() => {
                          setProjectDraft((prev) => ({ ...prev, targetCustomerId: '' }))
                          setCustomerQuery('')
                        }}
                        aria-label="حذف مشتری مقصد"
                        title="حذف مشتری مقصد"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {filteredCustomerOptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-500">نتیجه‌ای پیدا نشد.</div>
                    ) : (
                      filteredCustomerOptions.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setProjectDraft((prev) => ({ ...prev, targetCustomerId: String(customer.id) }))
                            setCustomerQuery(customer.fullName || `مشتری ${toPersianDigits(customer.id)}`)
                          }}
                          className={`w-full rounded-2xl border px-3 py-2 text-start transition-colors ${String(projectDraft.targetCustomerId) === String(customer.id) ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        ><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{customer.fullName || `مشتری ${toPersianDigits(customer.id)}`}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{customer.customerCode || `کد ${toPersianDigits(customer.id)}`}{customer.defaultPhone ? ` · ${toPersianDigits(customer.defaultPhone)}` : ''}</div></div>{String(projectDraft.targetCustomerId) === String(customer.id) ? <Badge tone="success">انتخاب‌شده</Badge> : null}</div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {customerQuery.trim()
                      ? `${toPN(filteredCustomerOptions.length)} نتیجه برای جستجو پیدا شد.`
                      : '۲ مشتری اخیر نمایش داده می‌شوند.'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(projectDraft.isDefault)}
              onChange={(event) => setProjectDraft((prev) => ({ ...prev, isDefault: event.target.checked }))}
              disabled={!canWriteCustomers}
            />
            پروژه پیش‌فرض
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleSaveProject} disabled={!canWriteCustomers}>{projectDraft.id ? 'ذخیره تغییرات' : 'ثبت پروژه'}</Button>
          {projectDraft.id && canWriteCustomers ? (
            <Button variant="secondary" onClick={() => resetProjectDraft(null)}>
              پروژه جدید
            </Button>
          ) : null}
          {projectDraft.id && canWriteCustomers ? (
            <Button variant="danger" onClick={() => handleDeleteProject(projectDraft)}>
              <Trash2 className="h-4 w-4" />
              حذف پروژه
            </Button>
          ) : null}
        </div>

        {!canWriteCustomers ? <div className="text-[11px] font-bold text-slate-500">فقط دسترسی مشاهده دارید.</div> : null}
      </Card>
    </div>
  )
}
