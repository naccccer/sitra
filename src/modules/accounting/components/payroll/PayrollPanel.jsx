import { useMemo, useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import { Button, Card, ModalShell, Select } from '@/components/shared/ui'
import { accountingApi } from '../../services/accountingApi'
import { usePayroll } from '../../hooks/usePayroll'
import { buildFormulaConfigFromCatalog } from './payrollCatalog'
import { PayrollImportPanel } from './PayrollImportPanel'
import { PayrollPaymentsPanel } from './PayrollPaymentsPanel'
import { PayrollReviewPanel } from './PayrollReviewPanel'
import { PayrollRunsPanel } from './PayrollRunsPanel'
import { PayrollSettingsPanel } from './PayrollSettingsPanel'
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

function resolveCurrentShamsiPeriodKey() {
  try {
    const jalaliNow = new DateObject({ date: new Date() }).convert(persian, persianFa)
    return `${String(jalaliNow.year).padStart(4, '0')}-${String(jalaliNow.month.number).padStart(2, '0')}`
  } catch {
    return ''
  }
}

const WORKFLOW_STEPS = {
  period: 'انتخاب یا ایجاد دوره',
  entry_review: 'ورود و بازبینی اطلاعات',
  finalize: 'نهایی‌سازی',
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

  const currentPeriodKey = useMemo(() => resolveCurrentShamsiPeriodKey(), [])
  const currentRun = useMemo(
    () => payroll.runs.find((run) => String(run.periodKey || '') === currentPeriodKey) || null,
    [currentPeriodKey, payroll.runs],
  )

  const selectedRun = payroll.selectedRun || currentRun
  const selectedRunSummary = useMemo(
    () => payroll.runs.find((item) => item.id === payroll.selectedRunId) || null,
    [payroll.runs, payroll.selectedRunId],
  )

  const catalog = Array.isArray(payroll.settings?.payrollItemCatalog) ? payroll.settings.payrollItemCatalog : []
  const editorPayslip = resolveScopedPayslip(selectedRun, editorPayslipId)
  const editorModel = editorPayslip || manualDraft
  const printModel = resolveScopedPayslip(selectedRun, activePayslipId)

  const issuedPayslips = useMemo(
    () => (Array.isArray(selectedRun?.payslips) ? selectedRun.payslips.filter((item) => item.status === 'issued') : []),
    [selectedRun],
  )
  const isFinalizedPeriod = payroll.workspace?.workflowState === 'finalized'
  const canOpenPayments = Boolean(selectedRun?.id) && isFinalizedPeriod
  const resolvedView = activeView === 'payments' && !canOpenPayments ? 'workflow' : activeView
  const effectivePaymentPayslipId = issuedPayslips.some((item) => item.id === paymentPayslipId)
    ? paymentPayslipId
    : (issuedPayslips[0]?.id || '')
  const paymentPayslip = resolveScopedPayslip(selectedRun, effectivePaymentPayslipId) || (issuedPayslips[0] ? { ...issuedPayslips[0], runId: selectedRun?.id } : null)

  const openEditor = (payslip) => {
    if (!payslip?.id) return
    setManualDraft(null)
    setEditorPayslipId(payslip.id)
    setActivePayslipId(payslip.id)
  }

  const openManualEntry = ({ employee, payslip }) => {
    if (payslip?.id) {
      openEditor(payslip)
      return
    }
    if (!employee?.id) return
    setEditorPayslipId('')
    setManualDraft(createManualPayslipDraft(employee))
  }

  const handleSaveSettings = async (nextSettings) => {
    await payroll.saveSettings(nextSettings)
    const formulas = buildFormulaConfigFromCatalog(nextSettings?.payrollItemCatalog || [])
    await accountingApi.saveSetting('accounting.payroll.formulas', formulas)
    setShowSettingsModal(false)
  }

  const handleFinalize = async (periodId) => {
    await payroll.runAction({ action: 'finalize_period', periodId })
    setActiveView('payments')
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">حقوق و دستمزد</div>
            <div className="text-xs font-bold text-slate-500">جریان ساده: انتخاب دوره، ورود/بازبینی، نهایی‌سازی. پرداخت در تب جدا انجام می‌شود.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="ghost" onClick={payroll.reload} disabled={payroll.loading} title="بازخوانی" aria-label="بازخوانی">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setShowSettingsModal(true)} title="تنظیمات تخصصی حقوق" aria-label="تنظیمات تخصصی حقوق">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={resolvedView === 'workflow' ? 'primary' : 'secondary'} onClick={() => setActiveView('workflow')}>ساخت فیش</Button>
          <Button size="sm" variant={resolvedView === 'payments' ? 'primary' : 'secondary'} onClick={() => setActiveView('payments')} disabled={!canOpenPayments}>پرداخت‌ها</Button>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">دوره جاری: {currentPeriodKey || '-'}</div>
        </div>

        {resolvedView === 'workflow' && (
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(WORKFLOW_STEPS).map(([stepId, label], index) => {
              const status = payroll.workflow.stepStatus?.[stepId] || 'blocked'
              const tone = status === 'completed'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : status === 'ready'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              return <div key={stepId} className={`rounded-xl border px-3 py-2 text-xs font-black ${tone}`}>{index + 1}. {label}</div>
            })}
          </div>
        )}
      </Card>

      {resolvedView === 'workflow' && (
        <>
          <PayrollRunsPanel
            busyKey={payroll.busyKey}
            canFinalize={canFinalize}
            canManage={canManage}
            onCreateRun={payroll.saveRun}
            onDeleteRun={payroll.deleteRun}
            onFinalize={handleFinalize}
            onSelectRun={payroll.setSelectedRunId}
            runs={payroll.runs}
            selectedRun={selectedRun}
            selectedRunId={payroll.selectedRunId}
            workspace={payroll.workspace}
          />

          {selectedRun && (
            <>
              <PayrollImportPanel
                busy={payroll.busyKey === 'import'}
                catalog={catalog}
                employees={payroll.employees}
                onApply={payroll.applyImport}
                onManualEntry={openManualEntry}
                onPreviewImport={payroll.previewImport}
                run={selectedRun}
                runId={payroll.selectedRunId}
                runPeriodKey={selectedRunSummary?.periodKey || ''}
              />

              <PayrollReviewPanel
                canManage={canManage}
                onEditPayslip={openEditor}
                onPrint={(payslip) => {
                  setActivePayslipId(payslip.id)
                  setShowPrint(true)
                }}
                run={selectedRun}
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

          {!canOpenPayments && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">برای ورود به پرداخت‌ها، ابتدا دوره را نهایی‌سازی کنید.</div>
          )}

          {canOpenPayments && (
            <>
              <Select value={effectivePaymentPayslipId || ''} onChange={(event) => setPaymentPayslipId(String(event.target.value || ''))}>
                {issuedPayslips.map((item) => (
                  <option key={item.id} value={item.id}>{item.employeeName || item.employeeCode || item.id}</option>
                ))}
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

      {showPrint && printModel && (
        <PayslipPrintView
          catalog={catalog}
          onClose={() => setShowPrint(false)}
          payslip={printModel}
          run={selectedRun}
          settings={payroll.settings}
        />
      )}
    </div>
  )
}