import { Card } from '@/components/shared/ui'

export function PayrollStageFrame({ actions = null, children, stageNumber, subtitle = '', title, tone = 'slate' }) {
  const headerClassName = tone === 'blue' ? 'bg-sky-950' : tone === 'emerald' ? 'bg-emerald-950' : 'bg-slate-900'

  return (
    <Card padding="none" className="overflow-hidden border-slate-200 shadow-sm">
      <div className={`rounded-t-2xl border-b border-slate-200 px-4 py-4 ${headerClassName}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {stageNumber ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-sm font-black text-white shadow-sm">
                {stageNumber}
              </div>
            ) : null}
            <div>
              <div className="text-sm font-black text-white">{title}</div>
              {subtitle ? <div className="mt-1 text-xs font-bold text-slate-200">{subtitle}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="space-y-4 bg-white p-4">{children}</div>
    </Card>
  )
}
