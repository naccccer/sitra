import { useMemo, useState } from 'react'
import { Button, Card, Input, Select } from '@/components/shared/ui'
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
  const [showSettings, setShowSettings] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [filters, setFilters] = useState({ q: '', status: '', employeeId: '' })

  const selectedRun = payroll.selectedRun
  const catalog = Array.isArray(payroll.settings?.payrollItemCatalog) ? payroll.settings.payrollItemCatalog : []
  const editorPayslip = resolveScopedPayslip(selectedRun, editorPayslipId)
  const editorModel = editorPayslip || manualDraft
  const printModel = resolveScopedPayslip(selectedRun, activePayslipId)
  const selectedPayslip = resolveScopedPayslip(selectedRun, activePayslipId) || selectedRun?.payslips?.[0] || null

  const filteredPayslips = useMemo(() => {
    const source = Array.isArray(selectedRun?.payslips) ? selectedRun.payslips : []
    return source.filter((item) => {
      if (filters.status && item.status !== filters.status) return false
      if (filters.employeeId && String(item.employeeId) !== String(filters.employeeId)) return false
      if (!filters.q) return true
      const text = `${item.employeeName || ''} ${item.employeeCode || ''}`.toLowerCase()
      return text.includes(filters.q.toLowerCase())
    })
  }, [filters, selectedRun])

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
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-900">حقوق و دستمزد</div>
            <div className="text-xs font-bold text-slate-500">جریان ساده: انتخاب دوره، ثبت دستی/اکسل، مدیریت فیش، چاپ و تسویه</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={payroll.reload} disabled={payroll.loading}>بازخوانی</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowSettings((current) => !current)}>{showSettings ? 'بستن تنظیمات' : 'تنظیمات فیش'}</Button>
          </div>
        </div>
        {payroll.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{payroll.error}</div>}
      </Card>

      {showSettings && <PayrollSettingsPanel busy={payroll.busyKey === 'settings'} canManage={canManageSettings} onSave={handleSaveSettings} settings={payroll.settings} />}

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
        selectedRun={selectedRun ? { ...selectedRun, payslips: filteredPayslips } : selectedRun}
        selectedRunId={payroll.selectedRunId}
      />

      <Card padding="md" className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="جستجوی نام یا کد پرسنلی" />
          <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">همه وضعیت‌ها</option>
            <option value="draft">پیش نویس</option>
            <option value="approved">تایید شده</option>
            <option value="issued">صادر شده</option>
            <option value="cancelled">لغو شده</option>
          </Select>
          <Select value={filters.employeeId} onChange={(event) => setFilters((current) => ({ ...current, employeeId: event.target.value }))}>
            <option value="">همه پرسنل</option>
            {payroll.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName || employee.name}</option>)}
          </Select>
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
      />

      <PayrollPaymentsPanel busy={payroll.busyKey === 'payment'} canManage={canManagePayments} onRecordPayment={payroll.recordPayment} payslip={selectedPayslip} />

      {editorModel && (
        <PayslipEditorModal
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
