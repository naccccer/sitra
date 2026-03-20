import { useMemo, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { PayrollRunsPanel } from './PayrollRunsPanel'
import { PayslipEditorModal } from './PayslipEditorModal'
import { PayslipPrintView } from './PayslipPrintView'
import { PayrollImportPanel } from './PayrollImportPanel'
import { PayrollPaymentsPanel } from './PayrollPaymentsPanel'
import { PayrollSettingsPanel } from './PayrollSettingsPanel'
import { formatMoney } from './payrollMath'

function useScopedPayslip(run, payslipId, options = {}) {
  const { fallbackToFirst = false } = options
  return useMemo(() => {
    const explicitPayslip = payslipId ? run?.payslips?.find((item) => item.id === payslipId) : null
    const payslip = explicitPayslip || (fallbackToFirst ? run?.payslips?.[0] || null : null)
    return payslip && run?.id ? { ...payslip, runId: run.id } : null
  }, [fallbackToFirst, payslipId, run])
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

export function PayrollLegacyLayout({ canApprove, canIssue, canManage, canManagePayments, canManageSettings, payroll }) {
  const [editorPayslipId, setEditorPayslipId] = useState('')
  const [manualDraft, setManualDraft] = useState(null)
  const [printPreview, setPrintPreview] = useState({ payslip: null, run: null, nonce: 0 })
  const [activePayslipId, setActivePayslipId] = useState('')
  const activePayslip = useScopedPayslip(payroll.selectedRun, activePayslipId, { fallbackToFirst: true })
  const editorPayslip = useScopedPayslip(payroll.selectedRun, editorPayslipId)
  const editorModel = editorPayslip || manualDraft
  const editorKey = editorModel?.id ? String(editorModel.id) : `new:${editorModel?.employeeId || 'editor'}`

  const focusPayslip = (payslip) => {
    if (!payslip?.id) return ''
    setManualDraft(null)
    setEditorPayslipId(payslip.id)
    setActivePayslipId(payslip.id)
    return payslip.id
  }

  const openManualEntry = ({ employee, payslip }) => {
    if (payslip?.id) {
      focusPayslip(payslip)
      return
    }
    if (!employee?.id) return
    setEditorPayslipId('')
    setManualDraft(createManualPayslipDraft(employee))
  }

  const openPrintPreview = (payslip) => {
    focusPayslip(payslip)
    setPrintPreview((current) => ({
      payslip: payslip ? { ...payslip, runId: payroll.selectedRun?.id || payslip.runId || '' } : null,
      run: payroll.selectedRun ? { ...payroll.selectedRun } : null,
      nonce: current.nonce + 1,
    }))
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(135deg,_#ffffff,_#f8fafc_58%,_#eef2ff)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">حقوق و دستمزد</div>
            <div className="text-xs font-bold text-slate-500">لیست ماهانه، فیش حرفه ای، ورود اکسل و ثبت پرداخت</div>
          </div>
          <Button size="sm" variant="ghost" onClick={payroll.reload} disabled={payroll.loading}>بازخوانی</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="پرسنل" value={payroll.dashboard.employees} />
          <StatCard label="تعداد دوره" value={payroll.dashboard.runs} />
          <StatCard label="جمع خالص" value={formatMoney(payroll.dashboard.net)} textValue />
          <StatCard label="مانده قابل پرداخت" value={formatMoney(payroll.dashboard.due)} textValue />
        </div>
        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}
      </Card>

      <PayrollRunsPanel
        busyKey={payroll.busyKey}
        canApprove={canApprove}
        canIssue={canIssue}
        canManage={canManage}
        onCreateRun={payroll.saveRun}
        onDeleteRun={payroll.deleteRun}
        onEditPayslip={focusPayslip}
        onPrint={openPrintPreview}
        onRunAction={payroll.runAction}
        onSelectRun={payroll.setSelectedRunId}
        runs={payroll.runs}
        selectedRun={payroll.selectedRun}
        selectedRunId={payroll.selectedRunId}
      />
      <div className="grid gap-4 2xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <PayrollImportPanel
            busy={payroll.busyKey === 'import'}
            employees={payroll.employees}
            onApply={payroll.applyImport}
            onManualEntry={openManualEntry}
            onPreviewImport={payroll.previewImport}
            run={payroll.selectedRun}
          />
        </div>
        <div className="space-y-4">
          <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={activePayslip} />
          <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={payroll.saveSettings} settings={payroll.settings} />
        </div>
      </div>
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
          await payroll.updatePayslip(payroll.selectedRun?.id, draft)
          setEditorPayslipId('')
          setManualDraft(null)
        }}
        onUploadPdf={(file) => (editorModel?.id ? payroll.uploadPdf(file, editorModel.id) : Promise.resolve())}
        payslip={editorModel}
        run={payroll.selectedRun}
      />
    </div>
  )
}

function StatCard({ label, textValue = false, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={`mt-2 font-black text-slate-900 ${textValue ? 'text-base' : 'text-2xl'}`}>{String(value)}</div>
    </div>
  )
}
