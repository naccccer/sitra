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

export const CustomerDetailsProjectsTab = ({
  projects = [],
  isLoadingProjects = false,
  selectedProjectId = '',
  projectDraft,
  setProjectDraft,
  canWriteCustomers = false,
  resetProjectDraft,
  handleSaveProject,
  handleDeleteProject,
}) => (
  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <Card tone="muted" padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">پروژه‌ها</div>
          <div className="text-xs font-bold text-slate-500">برای ویرایش، یک پروژه را انتخاب کنید.</div>
        </div>
        {canWriteCustomers ? <Button variant="secondary" onClick={() => resetProjectDraft(null)}>پروژه جدید</Button> : null}
      </div>
      {isLoadingProjects ? (
        <div className="text-xs font-bold text-slate-500">در حال بارگذاری...</div>
      ) : projects.length === 0 ? (
        <EmptyState title="پروژه‌ای یافت نشد" description="از فرم کنار، پروژه جدید بسازید." />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => resetProjectDraft(project)}
              className={`w-full rounded-2xl border px-3 py-3 text-start transition-colors ${selectedProjectId === String(project.id) ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white/80 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-900">
                  {project.name}
                  {project.isDefault ? <Badge className="ms-2" tone="info">پیش‌فرض</Badge> : null}
                </div>
                <span className="text-[11px] font-bold text-slate-400">برای ویرایش انتخاب کنید</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 sm:grid-cols-4">
                {projectSummaryCards(project).map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-2 py-2">
                    <div>{item.label}</div>
                    <div className="text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>

    <Card tone="muted" padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-900">{projectDraft.id ? 'ویرایش پروژه' : 'ایجاد پروژه'}</div>
      {projectDraft.id ? (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
          درحال ویرایش: {projectDraft.name || 'پروژه'}
        </div>
      ) : null}
      <Input value={projectDraft.name} onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="نام پروژه" disabled={!canWriteCustomers} />
      <Input value={projectDraft.notes} onChange={(event) => setProjectDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="توضیحات پروژه" disabled={!canWriteCustomers} />
      <Input value={toPersianDigits(projectDraft.targetCustomerId)} onChange={(event) => setProjectDraft((prev) => ({ ...prev, targetCustomerId: toEnglishDigits(event.target.value) }))} placeholder="شناسه مشتری مقصد" inputMode="numeric" disabled={!canWriteCustomers} />
      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
        <input type="checkbox" checked={Boolean(projectDraft.isDefault)} onChange={(event) => setProjectDraft((prev) => ({ ...prev, isDefault: event.target.checked }))} disabled={!canWriteCustomers} />
        پروژه پیش‌فرض
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={handleSaveProject} disabled={!canWriteCustomers}>{projectDraft.id ? 'ذخیره تغییرات' : 'ثبت پروژه'}</Button>
        {projectDraft.id && canWriteCustomers ? <Button variant="secondary" onClick={() => resetProjectDraft(null)}>پروژه جدید</Button> : null}
        {projectDraft.id && canWriteCustomers ? (
          <Button variant="danger" onClick={() => handleDeleteProject(projectDraft)}>
            حذف پروژه
          </Button>
        ) : null}
      </div>
      {!canWriteCustomers ? <div className="text-[11px] font-bold text-slate-500">فقط دسترسی مشاهده دارید.</div> : null}
    </Card>
  </div>
)
