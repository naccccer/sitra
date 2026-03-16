import { Badge, Button, Card } from '@/components/shared/ui'

const STEP_STYLES = {
  active: 'border-slate-900 bg-slate-900 text-white',
  idle: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
}

const SummaryTile = ({ label, value, hint }) => (
  <Card padding="sm" className="space-y-1">
    <div className="text-[11px] font-black text-slate-500">{label}</div>
    <div className="text-xl font-black text-slate-900" dir="ltr">{value}</div>
    <div className="text-[11px] font-bold text-slate-500">{hint}</div>
  </Card>
)

export const InventoryDashboardPanel = ({
  summary,
  sectionOptions,
  activeSection,
  onSectionChange,
  canSeedDefaults = false,
  isSeedingDefaults = false,
  onSeedDefaults,
}) => (
  <Card padding="md" className="space-y-4">
    <div className="space-y-1">
      <div className="text-sm font-black text-slate-900">داشبورد انبار</div>
      <div className="text-xs font-bold text-slate-500">
        مسیر پیشنهادی: تعریف کالا، ثبت سند، مدیریت درخواست‌ها، انبارگردانی و گزارش.
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <SummaryTile
        label="تعداد کالا"
        value={summary.itemsTotal}
        hint={`فعال: ${summary.activeItems} | غیرفعال: ${summary.inactiveItems}`}
      />
      <SummaryTile
        label="اسناد انبار"
        value={summary.documentsTotal}
        hint={`پیش نویس: ${summary.draftDocuments} | پست شده: ${summary.postedDocuments}`}
      />
      <SummaryTile
        label="درخواست خروج"
        value={summary.requestsTotal}
        hint={`در انتظار تایید: ${summary.pendingRequests}`}
      />
      <SummaryTile
        label="انبارگردانی"
        value={summary.sessionsTotal}
        hint={summary.openSessions > 0 ? `${summary.openSessions} نشست باز` : 'نشست باز ندارد'}
      />
    </div>

    <div className="space-y-2">
      <div className="text-xs font-black text-slate-700">بخش‌های کاری</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {sectionOptions.map((section, index) => {
          const isActive = section.id === activeSection
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`rounded-xl border px-3 py-3 text-start transition-colors ${isActive ? STEP_STYLES.active : STEP_STYLES.idle}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black">
                  مرحله {index + 1}: {section.label}
                </div>
                <Badge tone={isActive ? 'info' : 'neutral'}>{section.badge}</Badge>
              </div>
              <div className={`mt-1 text-[11px] font-bold ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                {section.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>

    {canSeedDefaults && (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <Button variant="secondary" onClick={onSeedDefaults} disabled={isSeedingDefaults}>
          {isSeedingDefaults ? 'در حال ایجاد 20 کالای پیش فرض...' : 'ایجاد 20 کالای پیش فرض'}
        </Button>
        <div className="text-[11px] font-bold text-slate-500">
          مجموعه اولیه با الهام از ماتریس شیشه برای تست سریع جریان ورود/خروج.
        </div>
      </div>
    )}
  </Card>
)
