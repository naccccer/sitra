import { useMemo, useState } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import { CalendarDays, RefreshCw, Settings2 } from 'lucide-react'
import { Button, Card, ModalShell, Select } from '@/components/shared/ui'
import { accountingApi } from '../../services/accountingApi'
import { usePayroll } from '../../hooks/usePayroll'
import { buildFormulaConfigFromCatalog } from './payrollCatalog'
import { PayrollImportPanel } from './PayrollImportPanel'
import { PayrollPaymentsPanel } from './PayrollPaymentsPanel'
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

export function PayrollPanel({ session }) {
  const permissions = useMemo(() => session?.permissions ?? [], [session])
  const canManage = permissions.includes('accounting.payroll.write')
  const canApprove = permissions.includes('accounting.payroll.approve') || canManage
  const canIssue = permissions.includes('accounting.payroll.issue') || canApprove
  const canManagePayments = permissions.includes('accounting.payroll.payments') || permissions.includes('accounting.payroll.record_payment') || canManage
  const canManageSettings = permissions.includes('accounting.payroll.settings') || permissions.includes('accounting.settings.write') || canManage

  const payroll = usePayroll()
  const [editorPayslipId, setEditorPayslipId] = useState('')
  const [manualDraft, setManualDraft] = useState(null)
  const [activePayslipId, setActivePayslipId] = useState('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showRunsModal, setShowRunsModal] = useState(false)
  const [showPrint, setShowPrint] = useState(false)

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
  const selectedPayslip = resolveScopedPayslip(selectedRun, activePayslipId) || selectedRun?.payslips?.[0] || null

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

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">حقوق و دستمزد</div>
            <div className="text-xs font-bold text-slate-500">جریان ساده: انتخاب دوره جاری، ثبت دستی/اکسل، مدیریت فیش، چاپ و تسویه</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="ghost" onClick={payroll.reload} disabled={payroll.loading} title="بازخوانی" aria-label="بازخوانی">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setShowRunsModal(true)} title="مدیریت دوره‌ها" aria-label="مدیریت دوره‌ها">
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setShowSettingsModal(true)} title="تنظیمات فیش" aria-label="تنظیمات فیش">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={payroll.selectedRunId || ''} onChange={(event) => payroll.setSelectedRunId(String(event.target.value || ''))}>
            <option value="">انتخاب دوره</option>
            {payroll.runs.map((run) => <option key={run.id} value={run.id}>{run.title || run.periodKey}</option>)}
          </Select>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            دوره جاری: {currentPeriodKey || '-'}
          </div>
        </div>
      </Card>

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

      <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={selectedPayslip} />

      <ModalShell
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="تنظیمات فیش حقوقی"
        description="پیکربندی سربرگ و کاتالوگ آیتم‌ها"
        maxWidthClass="max-w-6xl"
      >
        <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={handleSaveSettings} settings={payroll.settings} />
      </ModalShell>

      <ModalShell
        isOpen={showRunsModal}
        onClose={() => setShowRunsModal(false)}
        title="مدیریت دوره‌های حقوق"
        description="ایجاد، تایید، صدور و حذف دوره‌ها + فهرست کامل فیش‌ها"
        maxWidthClass="max-w-7xl"
      >
        <PayrollRunsPanel
          busyKey={payroll.busyKey}
          canApprove={canApprove}
          canIssue={canIssue}
          canManage={canManage}
          onCreateRun={payroll.saveRun}
          onDeleteRun={payroll.deleteRun}
          onEditPayslip={openEditor}
          onPrint={(payslip) => {
            setActivePayslipId(payslip.id)
            setShowPrint(true)
          }}
          onRunAction={payroll.runAction}
          onSelectRun={payroll.setSelectedRunId}
          runs={payroll.runs}
          selectedRun={payroll.selectedRun}
          selectedRunId={payroll.selectedRunId}
        />
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
            await payroll.updatePayslip(selectedRun?.id, draft)
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
