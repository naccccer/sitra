import { Card } from '@/components/shared/ui'

export function PayrollStageFrame({ actions = null, children, stageNumber, subtitle = '', title, tone = 'slate' }) {
  const barClassName = tone === 'blue' ? 'bg-sky-900' : tone === 'emerald' ? 'bg-emerald-900' : 'bg-slate-900'

  return (
    <Card padding="none" className="overflow-hidden border-slate-200 shadow-sm">
      <div className={barClassName} style={{ height: '4px' }} />
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-900 shadow-sm">
              {stageNumber}
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">{title}</div>
              {subtitle ? <div className="mt-1 text-xs font-bold text-slate-500">{subtitle}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="space-y-4 bg-white p-4">{children}</div>
    </Card>
  )
}
