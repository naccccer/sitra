import { useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, CircleDot, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/shared/ui'
import { buildRunSummary, formatMoney, formatNumber, monthLabel } from './payrollMath'
import { PayrollConfirmModal } from './PayrollConfirmModal'
import { PayrollStageFrame } from './PayrollStageFrame'

export function PayrollFinalizePanel({ busyKey, canFinalize, canManage, canReopen, onDeleteRun, onFinalize, onReopen, reopenDisabledReason, selectedRun, workspace }) {
  const summary = useMemo(() => buildRunSummary(selectedRun || {}), [selectedRun])
  const readiness = workspace?.finalizationReadiness || { canFinalize: false, blockers: [], counts: {} }
  const checklist = Array.isArray(workspace?.checklist) ? workspace.checklist : []
  const finalizing = busyKey === 'action:finalize_period'
  const reopening = busyKey === 'action:reopen_period'
  const isFinalized = workspace?.workflowState === 'finalized'
  const [pendingAction, setPendingAction] = useState('')

  if (!selectedRun) return null

  const confirmConfig = pendingAction === 'reopen'
    ? {
        title: 'بازگشایی دوره',
        description: 'فیش‌های نهایی‌شده دوباره به پیش‌نویس برمی‌گردند.',
        confirmLabel: 'بازگشایی دوره',
        body: 'آیا این دوره بازگشایی شود؟',
        icon: RotateCcw,
        confirmVariant: 'secondary',
      }
    : pendingAction === 'delete'
      ? {
          title: 'حذف دوره',
          description: 'این دوره و فیش‌های پیش‌نویس آن حذف می‌شوند.',
          confirmLabel: 'حذف دوره',
          body: 'آیا حذف این دوره را تایید می‌کنید؟',
          icon: Trash2,
          confirmVariant: 'danger',
        }
      : null

  const handleConfirmAction = async () => {
    if (pendingAction === 'reopen') {
      setPendingAction('')
      await onReopen(selectedRun.id)
      return
    }
    if (pendingAction === 'delete') {
      setPendingAction('')
      await onDeleteRun(selectedRun.id)
    }
  }

  return (
    <PayrollStageFrame
      stageNumber="3"
      title="نهایی‌سازی دوره"
      subtitle={`پس از کنترل نهایی، این دوره را صادر کنید تا وارد مدیریت پرداخت‌ها شود.${selectedRun.title ? ` ${selectedRun.title}` : ` لیست حقوق ${monthLabel(selectedRun.periodKey)}`}`}
      tone="emerald"
      actions={(
        <>
          {canManage && onReopen && isFinalized && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canReopen || reopening}
              title={canReopen ? 'بازگشایی دوره' : (reopenDisabledReason || 'بازگشایی این دوره مجاز نیست.')}
              onClick={() => setPendingAction('reopen')}
            >
              <RotateCcw className="h-4 w-4" />
              {reopening ? 'در حال بازگشایی...' : 'بازگشایی دوره'}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            disabled={!canFinalize || finalizing || !readiness.canFinalize}
            onClick={() => onFinalize(selectedRun.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
            {finalizing ? 'در حال نهایی‌سازی...' : 'نهایی‌سازی دوره'}
          </Button>
          {canManage && onDeleteRun && (
            <Button
              size="icon"
              variant="danger"
              disabled={busyKey === 'run-delete'}
              title="حذف دوره"
              aria-label="حذف دوره"
              onClick={() => setPendingAction('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <SummaryChip label="پرسنل" value={formatNumber(summary.employees)} />
        <SummaryChip label="جمع خالص" value={formatMoney(summary.net)} />
        <SummaryChip label="جمع پرداخت" value={formatMoney(summary.paid)} />
        <SummaryChip label="مانده پرداخت" value={formatMoney(summary.due)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-xs font-black text-slate-700">چک‌لیست آمادگی نهایی‌سازی</div>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}
                <span>{item.label}</span>
              </div>
              <span className="font-black text-slate-900">{formatNumber(item.value || 0)}</span>
            </div>
          ))}
          {checklist.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
              <CircleDot className="h-4 w-4" />
              داده‌ای برای چک‌لیست این دوره موجود نیست.
            </div>
          )}
        </div>
      </div>

      {(readiness.blockers || []).length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          {(readiness.blockers || []).map((blocker) => (
            <div key={`${blocker.code}:${blocker.step}`}>{blocker.message}</div>
          ))}
        </div>
      )}

      {isFinalized && !canReopen && reopenDisabledReason && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{reopenDisabledReason}</div>
      )}

      {confirmConfig && (
        <PayrollConfirmModal
          isOpen={Boolean(confirmConfig)}
          onClose={() => setPendingAction('')}
          onConfirm={handleConfirmAction}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          confirmVariant={confirmConfig.confirmVariant}
          icon={confirmConfig.icon}
          body={confirmConfig.body}
        />
      )}
    </PayrollStageFrame>
  )
}

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  )
}
