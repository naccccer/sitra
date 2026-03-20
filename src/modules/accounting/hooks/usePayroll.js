import { useCallback, useEffect, useMemo, useState } from 'react'
import { accountingApi } from '../services/accountingApi'
import {
  buildPayrollRun,
  normalizePayrollDetailPayslip,
  normalizePayrollEmployee,
  normalizePayrollListPayslip,
  normalizePayrollPeriod,
  safeNumber,
} from '../components/payroll/payrollMath'
import { shamsiMonthKeyToGregorianRange } from '../utils/dateUtils'
const DEFAULT_SETTINGS = {
  companyName: 'سامانه حقوق و دستمزد',
  companyId: '',
  signatureLabel: 'امضا و تایید',
  signatoryName: '',
  signatoryTitle: '',
  signatureNote: '',
  footerNote: 'این فیش به صورت سیستمی تولید شده است.',
}
const PAYROLL_INPUT_FIELDS = [
  'baseSalary',
  'housingAllowance',
  'foodAllowance',
  'childAllowance',
  'seniorityAllowance',
  'overtimeHours',
  'overtimePay',
  'bonus',
  'otherAdditions',
  'insurance',
  'tax',
  'loanDeduction',
  'advanceDeduction',
  'absenceDeduction',
  'otherDeductions',
]
const EMPTY_FILTERS = {}
function normalizePayrollSettings(value) {
  if (!value) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}
function splitFullName(payload = {}) {
  const firstName = String(payload.firstName || '').trim()
  const lastName = String(payload.lastName || '').trim()
  if (firstName && lastName) {
    return { firstName, lastName }
  }
  const fullName = String(payload.fullName || '').trim()
  if (!fullName) {
    return { firstName: '', lastName: '' }
  }
  const parts = fullName.split(/\s+/).filter(Boolean)
  const derivedFirst = parts.shift() || ''
  const derivedLast = parts.join(' ') || derivedFirst
  return { firstName: derivedFirst, lastName: derivedLast }
}
async function fetchAllPayrollPayslips(filters = {}) {
  const firstPage = await accountingApi.fetchPayrollPayslips({ ...filters, page: 1, pageSize: 100 })
  const firstItems = Array.isArray(firstPage?.payslips) ? firstPage.payslips : []
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1))
  if (totalPages === 1) {
    return firstItems.map(normalizePayrollListPayslip)
  }
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => accountingApi.fetchPayrollPayslips({
      ...filters,
      page: index + 2,
      pageSize: 100,
    })),
  )
  return [...firstItems, ...rest.flatMap((page) => Array.isArray(page?.payslips) ? page.payslips : [])]
    .map(normalizePayrollListPayslip)
}
export function usePayroll(filters = EMPTY_FILTERS) {
  const [employees, setEmployees] = useState([])
  const [periods, setPeriods] = useState([])
  const [payslips, setPayslips] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [selectedRun, setSelectedRun] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  const loadEmployees = useCallback(async () => {
    const data = await accountingApi.fetchPayrollEmployees()
    setEmployees((Array.isArray(data?.employees) ? data.employees : []).map(normalizePayrollEmployee))
  }, [])
  const loadPeriods = useCallback(async () => {
    const data = await accountingApi.fetchPayrollPeriods(filters)
    const nextPeriods = (Array.isArray(data?.periods) ? data.periods : []).map(normalizePayrollPeriod)
    setPeriods(nextPeriods)
    setSelectedRunId((current) => current || nextPeriods[0]?.id || '')
  }, [filters])
  const loadPayslips = useCallback(async () => {
    setPayslips(await fetchAllPayrollPayslips(filters))
  }, [filters])
  const loadSettings = useCallback(async () => {
    try {
      const data = await accountingApi.fetchPayrollSettings()
      setSettings(normalizePayrollSettings(data?.value))
    } catch {
      setSettings((current) => normalizePayrollSettings(current))
    }
  }, [])
  const loadSelectedRun = useCallback(async (runId) => {
    if (!runId) {
      setSelectedRun(null)
      return
    }
    const period = periods.find((item) => item.id === runId)
    if (!period) {
      setSelectedRun(null)
      return
    }
    const basePayslips = payslips.filter((item) => item.periodId === runId)
    const detailed = await Promise.all(basePayslips.map(async (item) => {
      try {
        const data = await accountingApi.fetchPayrollPayslip(item.id)
        return normalizePayrollDetailPayslip(data?.payslip ?? data?.item ?? data ?? item)
      } catch {
        return normalizePayrollDetailPayslip(item)
      }
    }))
    setSelectedRun(buildPayrollRun(period, detailed.length > 0 ? detailed : basePayslips))
  }, [periods, payslips])
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadEmployees(), loadPeriods(), loadPayslips(), loadSettings()])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [loadEmployees, loadPeriods, loadPayslips, loadSettings])
  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    loadSelectedRun(selectedRunId).catch((loadError) => setError(loadError.message))
  }, [loadSelectedRun, selectedRunId])
  const mutate = useCallback(async (key, action) => {
    setBusyKey(key)
    setError(null)
    try {
      const result = await action()
      await loadAll()
      return result
    } catch (mutationError) {
      setError(mutationError.message)
      throw mutationError
    } finally {
      setBusyKey('')
    }
  }, [loadAll])
  const saveEmployee = useCallback((payload) => mutate('employee', async () => {
    const names = splitFullName(payload)
    await accountingApi.savePayrollEmployee({
      id: payload?.id,
      employeeCode: payload?.employeeCode || '',
      firstName: names.firstName,
      lastName: names.lastName,
      personnelNo: payload?.personnelNo || '',
      nationalId: payload?.nationalId || '',
      mobile: payload?.mobile || '',
      bankName: payload?.bankName || '',
      bankAccountNo: payload?.bankAccountNo || payload?.bankAccount || '',
      bankSheba: payload?.bankSheba || '',
      baseSalary: safeNumber(payload?.baseSalary),
      defaultInputs: payload?.defaultInputs || {},
      notes: payload?.notes || payload?.department || '',
      isActive: payload?.isActive !== false,
    })
  }), [mutate])
  const saveRun = useCallback((payload) => mutate('run', async () => {
    const range = shamsiMonthKeyToGregorianRange(payload?.periodKey)
    const result = await accountingApi.savePayrollPeriod({
      ...payload,
      ...(range ? { startDate: range.startDate, endDate: range.endDate, payDate: range.endDate } : {}),
    })
    return result
  }).then((result) => {
    const nextId = result?.period?.id ?? result?.id ?? payload?.id ?? ''
    if (nextId) setSelectedRunId(nextId)
    return result
  }), [mutate])
  const updatePayslip = useCallback((periodId, payslip) => mutate('payslip', async () => {
    if (!periodId) {
      throw new Error('Payroll period is required.')
    }
    const inputs = PAYROLL_INPUT_FIELDS.reduce((result, field) => {
      result[field] = safeNumber(payslip?.[field])
      return result
    }, {})
    await accountingApi.savePayrollPayslip({
      id: payslip.id,
      employeeId: payslip.employeeId,
      periodId,
      inputs,
      notes: payslip.notes || '',
    })
  }), [mutate])
  const runAction = useCallback((payload) => mutate(`action:${payload?.action || 'run'}`, async () => {
    const action = payload?.action
    if (payload?.payslipId) {
      await accountingApi.runPayrollAction({ id: payload.payslipId, action })
      return
    }
    const periodId = payload?.id || selectedRunId
    const period = periods.find((item) => item.id === periodId) || {}
    const run = selectedRun || buildPayrollRun(period, payslips.filter((item) => item.periodId === periodId))
    const items = Array.isArray(run?.payslips) ? run.payslips : []
    const targetPayslips = action === 'approve'
      ? items.filter((item) => item.status === 'draft')
      : action === 'issue'
        ? items.filter((item) => item.status === 'approved')
        : []
    if (targetPayslips.length === 0) {
      throw new Error('No eligible payslips found for this action.')
    }
    for (const payslip of targetPayslips) {
      await accountingApi.runPayrollAction({ id: payslip.id, action })
    }
  }), [mutate, periods, payslips, selectedRun, selectedRunId])
  const recordPayment = useCallback((payslipId, payment) => mutate('payment', async () => {
    await accountingApi.runPayrollAction({
      id: payslipId,
      action: 'record_payment',
      amount: safeNumber(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.referenceNo,
      notes: payment.notes,
      accountId: payment.accountId || null,
    })
  }), [mutate])
  const applyImport = useCallback((payload) => mutate('import', async () => {
    await accountingApi.importPayroll(payload)
  }), [mutate])
  const uploadPdf = useCallback((file, payslipId) => mutate('pdf', async () => {
    await accountingApi.uploadPayrollFile(payslipId, file)
  }), [mutate])
  const saveSettings = useCallback(async (nextSettings) => {
    setBusyKey('settings')
    setError(null)
    try {
      await accountingApi.savePayrollSettings(nextSettings)
      await loadSettings()
    } catch (saveError) {
      setError(saveError.message)
      throw saveError
    } finally {
      setBusyKey('')
    }
  }, [loadSettings])
  const runs = useMemo(() => periods.map((period) => {
    const periodPayslips = payslips.filter((item) => item.periodId === period.id)
    return buildPayrollRun(period, periodPayslips)
  }), [periods, payslips])
  const dashboard = useMemo(() => runs.reduce((summary, run) => ({
    employees: employees.length,
    runs: summary.runs + 1,
    net: summary.net + safeNumber(run.summary?.net),
    due: summary.due + safeNumber(run.summary?.due),
  }), { employees: employees.length, runs: 0, net: 0, due: 0 }), [employees.length, runs])
  return {
    employees,
    runs,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
    settings,
    dashboard,
    loading,
    error,
    busyKey,
    saveEmployee,
    saveRun,
    updatePayslip,
    runAction,
    recordPayment,
    applyImport,
    uploadPdf,
    saveSettings,
    reload: loadAll,
  }
}
