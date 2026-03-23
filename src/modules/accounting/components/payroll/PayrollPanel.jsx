import { useEffect, useMemo, useState } from 'react'
import { Button, ModalShell } from '@/components/shared/ui'
import { usePayroll } from '../../hooks/usePayroll'
import { trackPayrollEvent } from '../../utils/payrollTelemetry'
import { PayrollRunsPanel } from './PayrollRunsPanel'
import { PayslipEditorModal } from './PayslipEditorModal'
import { PayslipPrintView } from './PayslipPrintView'
import { PayrollImportPanel } from './PayrollImportPanel'
import { PayrollPaymentsPanel } from './PayrollPaymentsPanel'
import { PayrollSettingsPanel } from './PayrollSettingsPanel'
import { PayrollWorkflowStep } from './PayrollWorkflowStep'
import { PayrollLegacyLayout } from './PayrollLegacyLayout'
import { formatMoney } from './payrollMath'

const STEP_META = {
  period: { label: 'دوره', title: 'انتخاب و مدیریت دوره حقوق', primary: 'ورود به آماده سازی فیش ها' },
  prepare: { label: 'آماده سازی فیش', title: 'آماده سازی فیش ها و کنترل ورودی اکسل/دستی', primary: 'ادامه به تایید و صدور' },
  approve_issue: { label: 'تایید/صدور', title: 'تایید و صدور نهایی فیش ها', primary: 'ادامه به پرداخت و تسویه' },
  payments: { label: 'پرداخت/خروجی', title: 'ثبت پرداخت، خروجی و بستن گردش ماه', primary: 'بازگشت به انتخاب دوره' },
}

function resolveWizardFlag(session) {
  if (typeof session?.featureFlags?.payroll_wizard_v2 === 'boolean') {
    return session.featureFlags.payroll_wizard_v2
  }
  if (typeof window === 'undefined') return true
  const localOverride = window.localStorage.getItem('payroll_wizard_v2')
  return localOverride !== '0'
}

function resolveScopedPayslip(run, payslipId, fallbackToFirst = false) {
  const explicit = payslipId ? run?.payslips?.find((item) => item.id === payslipId) : null
  const picked = explicit || (fallbackToFirst ? run?.payslips?.[0] || null : null)
  return picked && run?.id ? { ...picked, runId: run.id } : null
}

function createManualPayslipDraft(employee = {}) {
  return {
    id: '',
    employeeId: String(employee.id ?? ''),
    employeeCode: String(employee.employeeCode || employee.code || employee.personnelNo || ''),
    employeeName: String(employee.fullName || employee.name || ''),
    department: String(employee.department || ''),
    baseSalary: Number(employee.baseSalary || 0),
    housingAllowance: 0,
    foodAllowance: 0,
    childAllowance: 0,
    seniorityAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    bonus: 0,
    otherAdditions: 0,
    insurance: 0,
    tax: 0,
    loanDeduction: 0,
    advanceDeduction: 0,
    absenceDeduction: 0,
    otherDeductions: 0,
    notes: '',
    status: 'draft',
    payments: [],
    items: [],
    inputs: {},
    documents: [],
  }
}

export function PayrollPanel({ session }) {
  const permissions = useMemo(() => session?.permissions ?? [], [session])
  const canManage = permissions.includes('accounting.payroll.write')
  const canApprove = permissions.includes('accounting.payroll.approve') || canManage
  const canIssue = permissions.includes('accounting.payroll.issue') || canApprove
  const canManagePayments = permissions.includes('accounting.payroll.payments')
    || permissions.includes('accounting.payroll.record_payment')
    || canManage
  const canManageSettings = permissions.includes('accounting.payroll.settings') || permissions.includes('accounting.settings.write') || canManage

  const payroll = usePayroll()
  const wizardEnabled = useMemo(() => resolveWizardFlag(session), [session])
  const [editorPayslipId, setEditorPayslipId] = useState('')
  const [manualDraft, setManualDraft] = useState(null)
  const [activePayslipId, setActivePayslipId] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [printPreview, setPrintPreview] = useState({ payslip: null, run: null, nonce: 0 })
  const activeStep = payroll.workflow.currentStep
  const stepMeta = STEP_META[activeStep]
  const blockers = useMemo(() => payroll.workflow.blockersByStep[activeStep] || [], [activeStep, payroll.workflow.blockersByStep])
  const workspaceSummary = payroll.workspace?.summary || payroll.workflow.actionableCounts
  const steps = payroll.workflow.steps.map((id) => ({ id, label: STEP_META[id].label }))
  const selectedRun = payroll.selectedRun
  const issuedPayslips = (selectedRun?.payslips || []).filter((item) => item.status === 'issued')
  const activePayslip = useMemo(() => {
    const explicit = resolveScopedPayslip(selectedRun, activePayslipId, false)
    if (explicit) return explicit
    if (issuedPayslips.length > 0) return { ...issuedPayslips[0], runId: selectedRun?.id || issuedPayslips[0].runId || '' }
    return resolveScopedPayslip(selectedRun, activePayslipId, true)
  }, [activePayslipId, issuedPayslips, selectedRun])
  const editorPayslip = resolveScopedPayslip(selectedRun, editorPayslipId, false)
  const editorModel = editorPayslip || manualDraft
  const editorKey = editorModel?.id ? String(editorModel.id) : `new:${editorModel?.employeeId || 'editor'}`

  const openEditor = (payslip) => {
    if (!payslip?.id) return
    setManualDraft(null)
    setEditorPayslipId(payslip.id)
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

  const openPrintPreview = (payslip) => {
    setActivePayslipId(payslip.id)
    setPrintPreview((current) => ({
      payslip: payslip ? { ...payslip, runId: selectedRun?.id || payslip.runId || '' } : null,
      run: selectedRun ? { ...selectedRun } : null,
      nonce: current.nonce + 1,
    }))
  }

  const handlePrimaryAction = () => {
    if (activeStep === 'payments') {
      payroll.workflow.setCurrentStep('period')
      return
    }
    payroll.workflow.goNext()
  }

  useEffect(() => {
    trackPayrollEvent('payroll_wizard_step_viewed', { step: activeStep, periodId: selectedRun?.id || null })
  }, [activeStep, selectedRun?.id])

  useEffect(() => {
    if (blockers.length === 0) return
    trackPayrollEvent('payroll_wizard_step_blocked', {
      step: activeStep,
      blockerCode: blockers[0]?.code || 'unknown',
      blockerCount: blockers.length,
    })
  }, [activeStep, blockers])

  if (!wizardEnabled) {
    return <PayrollLegacyLayout canApprove={canApprove} canIssue={canIssue} canManage={canManage} canManagePayments={canManagePayments} canManageSettings={canManageSettings} payroll={payroll} />
  }

  return (
    <div className="space-y-4">
      <PayrollWorkflowStep
        blockers={blockers}
        currentStep={activeStep}
        onPrimaryAction={handlePrimaryAction}
        onStepChange={payroll.workflow.setCurrentStep}
        primaryActionDisabled={!payroll.workflow.canAdvance(activeStep)}
        primaryActionLabel={stepMeta.primary}
        steps={steps}
        summary={`پرسنل: ${workspaceSummary?.employees ?? 0} | پیش نویس: ${workspaceSummary?.draft ?? 0} | تاییدشده: ${workspaceSummary?.approved ?? 0} | صادرشده: ${workspaceSummary?.issued ?? 0} | مانده: ${formatMoney(workspaceSummary?.due ?? 0)}`}
        title={stepMeta.title}
      >
        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}
        {activeStep === 'period' && (
          <PayrollRunsPanel
            busyKey={payroll.busyKey}
            canApprove={false}
            canIssue={false}
            canManage={canManage}
            onCreateRun={payroll.saveRun}
            onDeleteRun={payroll.deleteRun}
            onEditPayslip={openEditor}
            onPrint={openPrintPreview}
            onRunAction={payroll.runAction}
            onSelectRun={payroll.setSelectedRunId}
            runs={payroll.runs}
            selectedRun={selectedRun}
            selectedRunId={payroll.selectedRunId}
          />
        )}
        {activeStep === 'prepare' && (
          <div className="space-y-4">
            <PayrollImportPanel
              busy={payroll.busyKey === 'import'}
              employees={payroll.employees}
              onApply={payroll.applyImport}
              onManualEntry={openManualEntry}
              onPreviewImport={payroll.previewImport}
              run={selectedRun}
            />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                  <tr><th className="px-3 py-2">پرسنل</th><th className="px-3 py-2">وضعیت</th><th className="px-3 py-2">خالص</th><th className="px-3 py-2">عملیات</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedRun?.payslips || []).map((payslip) => (
                    <tr key={payslip.id}>
                      <td className="px-3 py-2"><div className="font-black text-slate-900">{payslip.employeeName}</div><div className="text-[11px] font-bold text-slate-500">{payslip.employeeCode || '-'}</div></td>
                      <td className="px-3 py-2 font-bold text-slate-600">{payslip.status || 'draft'}</td>
                      <td className="px-3 py-2 font-black text-slate-900">{formatMoney(payslip.net)}</td>
                      <td className="px-3 py-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => openEditor(payslip)}>ویرایش</Button><Button size="sm" variant="ghost" onClick={() => openPrintPreview(payslip)}>چاپ</Button></div></td>
                    </tr>
                  ))}
                  {(selectedRun?.payslips || []).length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center font-bold text-slate-400">فیشی برای این دوره موجود نیست.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeStep === 'approve_issue' && (
          <PayrollRunsPanel
            busyKey={payroll.busyKey}
            canApprove={canApprove}
            canIssue={canIssue}
            canManage={canManage}
            onCreateRun={payroll.saveRun}
            onDeleteRun={payroll.deleteRun}
            onEditPayslip={openEditor}
            onPrint={openPrintPreview}
            onRunAction={payroll.runAction}
            onSelectRun={payroll.setSelectedRunId}
            runs={payroll.runs}
            selectedRun={selectedRun}
            selectedRunId={payroll.selectedRunId}
          />
        )}
        {activeStep === 'payments' && (
          <div className="grid gap-4 2xl:grid-cols-[.9fr_1.1fr]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-900">فیش های صادرشده</div>
                <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)}>تنظیمات چاپ</Button>
              </div>
              {issuedPayslips.map((item) => (
                <button key={item.id} type="button" onClick={() => setActivePayslipId(item.id)} className={`w-full rounded-xl border px-3 py-2 text-start text-xs font-bold ${activePayslip?.id === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <div>{item.employeeName}</div>
                  <div className={activePayslip?.id === item.id ? 'text-white/70' : 'text-slate-500'}>مانده: {formatMoney(item.due)}</div>
                </button>
              ))}
              {issuedPayslips.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs font-bold text-slate-400">فیش صادرشده ای برای پرداخت وجود ندارد.</div>}
            </div>
            <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={activePayslip} />
          </div>
        )}
      </PayrollWorkflowStep>

      {printPreview.payslip && <PayslipPrintView key={`${printPreview.payslip.runId || printPreview.run?.id || 'run'}:${printPreview.payslip.id}:${printPreview.nonce}`} onClose={() => setPrintPreview((current) => ({ ...current, payslip: null, run: null }))} payslip={printPreview.payslip} run={printPreview.run} settings={payroll.settings} />}
      <PayslipEditorModal
        key={editorKey}
        busy={payroll.busyKey === 'payslip' || payroll.busyKey === 'pdf'}
        employees={payroll.employees}
        onClose={() => {
          setEditorPayslipId('')
          setManualDraft(null)
        }}
        onSave={async (draft) => {
          await payroll.updatePayslip(selectedRun?.id, draft)
          setEditorPayslipId('')
          setManualDraft(null)
        }}
        onUploadPdf={(file) => (editorModel?.id ? payroll.uploadPdf(file, editorModel.id) : Promise.resolve())}
        payslip={editorModel}
        run={selectedRun}
      />

      <ModalShell isOpen={showSettings} onClose={() => setShowSettings(false)} title="تنظیمات چاپ فیش" description="تنظیمات چاپ خارج از جریان اصلی پرداخت" maxWidthClass="max-w-3xl">
        <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={payroll.saveSettings} settings={payroll.settings} />
      </ModalShell>
    </div>
  )
}
