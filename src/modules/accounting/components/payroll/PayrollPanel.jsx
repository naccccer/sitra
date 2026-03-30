import { useMemo, useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import { Button, Card, ModalShell, Select } from '@/components/shared/ui'
import { usePayrollCurrentRunSelection } from '@/modules/accounting/hooks/usePayrollCurrentRunSelection'
import { accountingApi } from '../../services/accountingApi'
import { usePayroll } from '../../hooks/usePayroll'
import { buildFormulaConfigFromCatalog } from './payrollCatalog'
import { PayrollFinalizeConfirmModal } from './PayrollFinalizeConfirmModal'
import { PayrollImportPanel } from './PayrollImportPanel'
import { PayrollFinalizePanel } from './PayrollFinalizePanel'
import { PayrollPaymentsPanel } from './PayrollPaymentsPanel'
import { PayrollReviewPanel } from './PayrollReviewPanel'
import { PayrollRunsPanel } from './PayrollRunsPanel'
import { PayrollSettingsPanel } from './PayrollSettingsPanel'
import { PayrollStageFrame } from './PayrollStageFrame'
import { PayslipEditorModal } from './PayslipEditorModal'
import { PayslipPrintView } from './PayslipPrintView'

function resolveScopedPayslip(run, payslipId) {
  const item = payslipId ? run?.payslips?.find((entry) => entry.id === payslipId) : null
  return item && run?.id ? { ...item, runId: run.id } : null
}

function createManualPayslipDraft(employee = {}) {
  const baseSalary = Number(employee.baseSalary || 0)
  return {
    id: '',
    employeeId: String(employee.id ?? ''),
    employeeCode: String(employee.employeeCode || employee.code || employee.personnelNo || ''),
    employeeName: String(employee.fullName || employee.name || ''),
    department: String(employee.department || ''),
    status: 'draft',
    baseSalary,
    inputs: { baseSalary },
    items: [],
    payments: [],
    documents: [],
    notes: '',
  }
}

export function PayrollPanel({ session }) {
  const permissions = useMemo(() => session?.permissions ?? [], [session])
  const canManage = permissions.includes('accounting.payroll.write')
  const canManagePayments = permissions.includes('accounting.payroll.payments') || permissions.includes('accounting.payroll.record_payment') || canManage
  const canManageSettings = permissions.includes('accounting.payroll.settings') || permissions.includes('accounting.settings.write') || canManage
  const canFinalize = canManage || (permissions.includes('accounting.payroll.approve') && permissions.includes('accounting.payroll.issue'))
  const payroll = usePayroll()
  const [editorPayslipId, setEditorPayslipId] = useState('')
  const [manualDraft, setManualDraft] = useState(null)
  const [activePayslipId, setActivePayslipId] = useState('')
  const [paymentPayslipId, setPaymentPayslipId] = useState('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [activeView, setActiveView] = useState('workflow')
  const [paperSize, setPaperSize] = useState('a4')
  const [pendingFinalizePeriodId, setPendingFinalizePeriodId] = useState('')
  const { currentPeriodKey, selectedRun, selectedRunSummary } = usePayrollCurrentRunSelection({
    runs: payroll.runs,
    selectedRun: payroll.selectedRun,
    selectedRunId: payroll.selectedRunId,
    setSelectedRunId: payroll.setSelectedRunId,
  })
  const catalog = Array.isArray(payroll.settings?.payrollItemCatalog) ? payroll.settings.payrollItemCatalog : []
  const editorPayslip = resolveScopedPayslip(selectedRun, editorPayslipId)
  const editorModel = editorPayslip || manualDraft
  const printModel = resolveScopedPayslip(selectedRun, activePayslipId)
  const issuedPayslips = useMemo(() => (Array.isArray(selectedRun?.payslips) ? selectedRun.payslips.filter((item) => item.status === 'issued') : []), [selectedRun])
  const isFinalizedPeriod = payroll.workspace?.workflowState === 'finalized'
  const canReopenPeriod = canManage && isFinalizedPeriod && Number(payroll.workspace?.summary?.issued || 0) > 0 && Number(payroll.workspace?.summary?.paid || 0) <= 0
  const reopenDisabledReason = useMemo(() => {
    if (!canManage || !isFinalizedPeriod || canReopenPeriod) return ''
    const summary = payroll.workspace?.summary || {}
    if (Number(summary.paid || 0) > 0) return 'دوره‌ای که برای آن پرداخت ثبت شده باشد، قابل بازگشایی نیست.'
    if (Number(summary.issued || 0) <= 0) return 'این دوره فیش نهایی‌شده‌ای برای بازگشایی ندارد.'
    return ''
  }, [canManage, canReopenPeriod, isFinalizedPeriod, payroll.workspace?.summary])
  const canOpenPayments = Boolean(selectedRun?.id) && isFinalizedPeriod
  const resolvedView = activeView === 'payments' && !canOpenPayments ? 'workflow' : activeView
  const effectivePaymentPayslipId = issuedPayslips.some((item) => item.id === paymentPayslipId) ? paymentPayslipId : (issuedPayslips[0]?.id || '')
  const paymentPayslip = resolveScopedPayslip(selectedRun, effectivePaymentPayslipId) || (issuedPayslips[0] ? { ...issuedPayslips[0], runId: selectedRun?.id } : null)

  const openEditor = (payslip) => {
    if (!payslip?.id) return
    setManualDraft(null)
    setEditorPayslipId(payslip.id)
    setActivePayslipId(payslip.id)
  }

  const openManualEntry = ({ employee, payslip }) => {
    if (payslip?.id) return openEditor(payslip)
    if (!employee?.id) return
    setEditorPayslipId('')
    setManualDraft(createManualPayslipDraft(employee))
  }

  const handleSaveSettings = async (nextSettings) => {
    await payroll.saveSettings(nextSettings)
    await accountingApi.saveSetting('accounting.payroll.formulas', buildFormulaConfigFromCatalog(nextSettings?.payrollItemCatalog || []))
    setShowSettingsModal(false)
  }

  const handleFinalize = async (periodId) => {
    if (periodId) setPendingFinalizePeriodId(String(periodId))
  }

  const confirmFinalize = async () => {
    if (!pendingFinalizePeriodId) return
    const periodId = pendingFinalizePeriodId
    setPendingFinalizePeriodId('')
    await payroll.runAction({ action: 'finalize_period', periodId })
    setActiveView('payments')
  }

  const handleReopen = async (periodId) => {
    await payroll.runAction({ action: 'reopen_period', periodId })
    setActiveView('workflow')
  }

  const handleDeletePayslip = async (payslip) => {
    if (!payslip?.id) return
    await accountingApi.deletePayrollPayslip(payslip.id)
    await payroll.reload()
  }

  return (
    <div className="space-y-5">
      <Card padding="md" className="space-y-4 border-slate-200 bg-gradient-to-l from-white via-slate-50 to-slate-100 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-black text-slate-900">حقوق و دستمزد</div>
            <div className="mt-1 text-xs font-bold text-slate-500">ساخت فیش و پرداخت در دو نمای جدا مدیریت می‌شود.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="ghost" onClick={payroll.reload} disabled={payroll.loading} title="بازخوانی" aria-label="بازخوانی"><RefreshCw className="h-4 w-4" /></Button>
            <Button size="icon" variant="secondary" onClick={() => setShowSettingsModal(true)} title="تنظیمات تخصصی حقوق" aria-label="تنظیمات تخصصی حقوق"><Settings2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={resolvedView === 'workflow' ? 'primary' : 'secondary'} onClick={() => setActiveView('workflow')}>ساخت فیش</Button>
            <Button size="sm" variant={resolvedView === 'payments' ? 'primary' : 'secondary'} onClick={() => setActiveView('payments')} disabled={!canOpenPayments}>پرداخت‌ها</Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">دوره جاری: {currentPeriodKey || '-'}</div>
        </div>
      </Card>

      {resolvedView === 'workflow' && (
        <>
          <PayrollRunsPanel
            busyKey={payroll.busyKey}
            canManage={canManage}
            onCreateRun={payroll.saveRun}
            onSelectRun={payroll.setSelectedRunId}
            runs={payroll.runs}
            selectedRun={selectedRun}
            selectedRunId={payroll.selectedRunId}
            workspace={payroll.workspace}
          />
          {selectedRun && (
            <>
              <PayrollStageFrame stageNumber="2" title="ورود و بازبینی اطلاعات" subtitle="ورود، اصلاح و کنترل فیش‌ها در یک مرحله انجام می‌شود." tone="blue">
                <PayrollImportPanel
                  busy={payroll.busyKey === 'import'}
                  catalog={catalog}
                  employees={payroll.employees}
                  embedded
                  onApply={payroll.applyImport}
                  onManualEntry={openManualEntry}
                  onPreviewImport={payroll.previewImport}
                  run={selectedRun}
                  runId={payroll.selectedRunId}
                  runPeriodKey={selectedRunSummary?.periodKey || selectedRun?.periodKey || ''}
                />
                <PayrollReviewPanel
                  canManage={canManage}
                  embedded
                  onDeletePayslip={handleDeletePayslip}
                  onEditPayslip={openEditor}
                  onPaperSizeChange={setPaperSize}
                  onPrint={(payslip) => {
                    setActivePayslipId(payslip.id)
                    setShowPrint(true)
                  }}
                  paperSize={paperSize}
                  run={selectedRun}
                />
              </PayrollStageFrame>
              <PayrollFinalizePanel
                busyKey={payroll.busyKey}
                canFinalize={canFinalize}
                canManage={canManage}
                onDeleteRun={payroll.deleteRun}
                onFinalize={handleFinalize}
                onReopen={handleReopen}
                canReopen={canReopenPeriod}
                reopenDisabledReason={reopenDisabledReason}
                selectedRun={selectedRun}
                workspace={payroll.workspace}
              />
            </>
          )}
        </>
      )}

      {resolvedView === 'payments' && (
        <Card padding="md" className="space-y-3">
          <div>
            <div className="text-sm font-black text-slate-900">مدیریت پرداخت‌های دوره نهایی‌شده</div>
            <div className="text-xs font-bold text-slate-500">ثبت تسویه بعد از نهایی‌سازی انجام می‌شود و از جریان ساخت فیش جدا است.</div>
          </div>
          {!canOpenPayments && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">برای ورود به پرداخت‌ها، ابتدا دوره را نهایی‌سازی کنید.</div>}
          {canOpenPayments && (
            <>
              <Select value={effectivePaymentPayslipId || ''} onChange={(event) => setPaymentPayslipId(String(event.target.value || ''))}>
                {issuedPayslips.map((item) => <option key={item.id} value={item.id}>{item.employeeName || item.employeeCode || item.id}</option>)}
              </Select>
              <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={paymentPayslip} />
            </>
          )}
        </Card>
      )}

      <ModalShell
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="تنظیمات تخصصی حقوق"
        description="فرمول‌ساز و کاتالوگ آیتم‌ها برای مدیر سیستم"
        maxWidthClass="max-w-6xl"
      >
        <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={handleSaveSettings} settings={payroll.settings} />
      </ModalShell>

      <PayrollFinalizeConfirmModal isOpen={Boolean(pendingFinalizePeriodId)} onClose={() => setPendingFinalizePeriodId('')} onConfirm={confirmFinalize} />

      {editorModel && (
        <PayslipEditorModal
          key={`${selectedRun?.id || 'run'}:${editorModel?.id || editorModel?.employeeId || 'draft'}`}
          busy={payroll.busyKey === 'payslip' || payroll.busyKey === 'pdf'}
          catalog={catalog}
          employees={payroll.employees}
          onClose={() => {
            setEditorPayslipId('')
            setManualDraft(null)
          }}
          onSave={async (draft) => {
            await payroll.updatePayslip(selectedRun?.id || payroll.selectedRunId, draft)
            setEditorPayslipId('')
            setManualDraft(null)
          }}
          onUploadPdf={(file) => (editorModel?.id ? payroll.uploadPdf(file, editorModel.id) : Promise.resolve())}
          payslip={editorModel}
          run={selectedRun}
        />
      )}

      {showPrint && printModel && <PayslipPrintView catalog={catalog} paperSize={paperSize} onClose={() => setShowPrint(false)} payslip={printModel} run={selectedRun} settings={payroll.settings} />}
    </div>
  )
}
