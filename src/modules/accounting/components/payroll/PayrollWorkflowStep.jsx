import { Button, Card } from '@/components/shared/ui'

export function PayrollWorkflowStep({
  blockers = [],
  children = null,
  currentStep = 'period',
  onPrimaryAction = () => {},
  onStepChange = () => {},
  primaryActionDisabled = false,
  primaryActionLabel = '',
  steps = [],
  summary = null,
  title = '',
}) {
  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-slate-900">{title}</div>
          {summary ? <div className="mt-1 text-xs font-bold text-slate-500">{summary}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={`rounded-full border px-3 py-1 text-xs font-black transition-colors ${isCurrent ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {index + 1}. {step.label}
              </button>
            )
          })}
        </div>
      </div>

      {blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          {blockers.map((blocker) => (
            <div key={`${blocker.step}:${blocker.code}`}>{blocker.message}</div>
          ))}
        </div>
      )}

      {children}

      {primaryActionLabel && (
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <Button size="sm" variant="primary" disabled={primaryActionDisabled} onClick={onPrimaryAction}>
            {primaryActionLabel}
          </Button>
        </div>
      )}
    </Card>
  )
}
