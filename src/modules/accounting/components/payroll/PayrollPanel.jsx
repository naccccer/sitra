import { useMemo, useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { usePayroll } from '../../hooks/usePayroll'
import { PayrollEmployeesPanel } from './PayrollEmployeesPanel'
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
  const [editorPayslipId, setEditorPayslipId] = useState('')
  const [printPreview, setPrintPreview] = useState({ payslip: null, run: null, nonce: 0 })
  const [activePayslipId, setActivePayslipId] = useState('')

  const activePayslip = useScopedPayslip(payroll.selectedRun, activePayslipId, { fallbackToFirst: true })
  const editorPayslip = useScopedPayslip(payroll.selectedRun, editorPayslipId)

  const focusPayslip = (payslip) => {
    setActivePayslipId(payslip.id)
    return payslip.id
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
            <div className="text-xs font-bold text-slate-500">گردش کامل پرسنل، لیست ماهانه، فیش حرفه ای، ورود اکسل و ثبت پرداخت</div>
          </div>
          <Button size="sm" variant="ghost" onClick={payroll.reload} disabled={payroll.loading}>بازخوانی</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="پرسنل فعال" value={payroll.dashboard.employees} />
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
        onEditPayslip={(payslip) => setEditorPayslipId(focusPayslip(payslip))}
        onPrint={openPrintPreview}
        onRunAction={payroll.runAction}
        onSelectRun={payroll.setSelectedRunId}
        runs={payroll.runs}
        selectedRun={payroll.selectedRun}
        selectedRunId={payroll.selectedRunId}
      />

      <div className="grid gap-4 2xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <PayrollImportPanel busy={payroll.busyKey === 'import'} employees={payroll.employees} run={payroll.selectedRun} onApply={payroll.applyImport} />
          <PayrollEmployeesPanel employees={payroll.employees} busy={payroll.busyKey === 'employee'} canManage={canManage} onSave={payroll.saveEmployee} />
        </div>
        <div className="space-y-4">
          <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={activePayslip} />
          <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={payroll.saveSettings} settings={payroll.settings} />
        </div>
      </div>

      {printPreview.payslip && (
        <PayslipPrintView
          key={`${printPreview.payslip.runId || printPreview.run?.id || 'run'}:${printPreview.payslip.id}:${printPreview.nonce}`}
          onClose={() => setPrintPreview((current) => ({ ...current, payslip: null, run: null }))}
          payslip={printPreview.payslip}
          run={printPreview.run}
          settings={payroll.settings}
        />
      )}

      <PayslipEditorModal
        key={editorPayslip?.id || 'editor'}
        busy={payroll.busyKey === 'payslip' || payroll.busyKey === 'pdf'}
        onClose={() => setEditorPayslipId('')}
        onSave={async (draft) => {
          await payroll.updatePayslip(payroll.selectedRun?.id, draft)
          setEditorPayslipId('')
        }}
        onUploadPdf={(file) => (editorPayslip?.id ? payroll.uploadPdf(file, editorPayslip.id) : Promise.resolve())}
        payslip={editorPayslip}
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
