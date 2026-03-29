import { useCallback, useEffect, useMemo, useState } from 'react'
import { accountingApi } from '../services/accountingApi'
import {
  buildPayrollRun,
  normalizePayrollDetailPayslip,
  normalizePayrollEmployee,
  normalizePayrollPeriod,
  safeNumber,
} from '../components/payroll/payrollMath'
import { DEFAULT_PAYROLL_SETTINGS, fetchAllPayrollPayslips, normalizePayrollSettings, PAYROLL_INPUT_FIELDS } from './usePayrollDataUtils'
import { usePayrollWorkflow } from './usePayrollWorkflow'
import { trackPayrollEvent } from '../utils/payrollTelemetry'
import { shamsiMonthKeyToGregorianRange } from '../utils/dateUtils'

const EMPTY_FILTERS = {}

export function usePayroll(filters = EMPTY_FILTERS) {
  const [employees, setEmployees] = useState([])
  const [periods, setPeriods] = useState([])
  const [payslips, setPayslips] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [selectedRun, setSelectedRun] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_PAYROLL_SETTINGS)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busyKey, setBusyKey] = useState('')

  const loadEmployees = useCallback(async () => {
    const data = await accountingApi.fetchPayrollEmployees({ isActive: true })
    setEmployees((Array.isArray(data?.employees) ? data.employees : []).map(normalizePayrollEmployee))
  }, [])

  const loadPeriods = useCallback(async () => {
    const data = await accountingApi.fetchPayrollPeriods(filters)
    const nextPeriods = (Array.isArray(data?.periods) ? data.periods : []).map(normalizePayrollPeriod)
    setPeriods(nextPeriods)
    setSelectedRunId((current) => {
      if (nextPeriods.length === 0) return ''
      if (current && nextPeriods.some((item) => item.id === current)) return current
      return nextPeriods[0]?.id || ''
    })
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

  const loadWorkspace = useCallback(async (runId) => {
    if (!runId) {
      setWorkspace(null)
      return
    }
    try {
      const data = await accountingApi.fetchPayrollWorkspace(runId)
      setWorkspace(data?.workspace || null)
    } catch {
      setWorkspace(null)
    }
  }, [])

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
  useEffect(() => {
    loadWorkspace(selectedRunId).catch(() => {})
  }, [loadWorkspace, selectedRunId, payslips.length])

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

  const saveRun = useCallback((payload) => {
    const duplicate = periods.find((item) => String(item.periodKey || '') === String(payload?.periodKey || ''))
    if (duplicate?.id) {
      setSelectedRunId(duplicate.id)
      return Promise.resolve({ period: duplicate, reused: true })
    }
    return mutate('run', async () => {
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
    })
  }, [mutate, periods])

  const deleteRun = useCallback((runId) => mutate('run-delete', async () => {
    if (!runId) {
      throw new Error('Payroll period id is required.')
    }
    return accountingApi.deletePayrollPeriod(runId)
  }), [mutate])

  const updatePayslip = useCallback((periodId, payslip) => mutate('payslip', async () => {
    if (!periodId) {
      throw new Error('Payroll period is required.')
    }
    const fixedInputs = PAYROLL_INPUT_FIELDS.reduce((result, field) => {
      result[field] = safeNumber(payslip?.[field])
      return result
    }, {})
    const dynamicInputs = Object.entries(payslip?.inputs || {}).reduce((result, [field, value]) => {
      result[field] = safeNumber(value)
      return result
    }, {})
    const inputs = { ...fixedInputs, ...dynamicInputs }
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
    if (Array.isArray(payload?.ids) && payload.ids.length > 0) {
      const result = await accountingApi.runPayrollBulkAction({ action, ids: payload.ids })
      trackPayrollEvent('payroll_bulk_action_result', { action, successCount: safeNumber(result?.succeeded), failCount: safeNumber(result?.failed) })
      if (action === 'issue' && safeNumber(result?.failed) === 0) {
        trackPayrollEvent('payroll_run_completed', { periodId: payload?.id || selectedRunId })
      }
      if (safeNumber(result?.succeeded) <= 0) throw new Error(result?.error || 'No payslips were updated for this action.')
      return result
    }
    if (payload?.payslipId) {
      const result = await accountingApi.runPayrollAction({ id: payload.payslipId, action })
      trackPayrollEvent('payroll_bulk_action_result', { action, successCount: 1, failCount: 0 })
      return result
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
    if (targetPayslips.length === 0) throw new Error('No eligible payslips found for this action.')
    const result = await accountingApi.runPayrollBulkAction({ action, ids: targetPayslips.map((payslip) => payslip.id) })
    trackPayrollEvent('payroll_bulk_action_result', { action, successCount: safeNumber(result?.succeeded), failCount: safeNumber(result?.failed) })
    if (action === 'issue' && safeNumber(result?.failed) === 0) {
      trackPayrollEvent('payroll_run_completed', { periodId })
    }
    if (safeNumber(result?.succeeded) <= 0) throw new Error(result?.error || 'No eligible payslips were updated for this action.')
    return result
  }), [mutate, periods, payslips, selectedRun, selectedRunId])

  const recordPayment = useCallback((payslipId, payment) => mutate('payment', async () => {
    const result = await accountingApi.runPayrollAction({
      id: payslipId,
      action: 'record_payment',
      amount: safeNumber(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.referenceNo,
      notes: payment.notes,
      accountId: payment.accountId || null,
    })
    trackPayrollEvent('payroll_payment_recorded', { payslipId, amount: safeNumber(payment.amount) })
    return result
  }), [mutate])

  const applyImport = useCallback((payload) => mutate('import', async () => (
    accountingApi.importPayroll(payload)
  )), [mutate])

  const previewImport = useCallback(async (payload) => accountingApi.previewPayrollImport(payload), [])

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

  const workflow = usePayrollWorkflow(selectedRun)

  return {
    employees,
    runs,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
    settings,
    workspace,
    dashboard,
    workflow,
    loading,
    error,
    busyKey,
    saveRun,
    deleteRun,
    updatePayslip,
    runAction,
    recordPayment,
    applyImport,
    previewImport,
    uploadPdf,
    saveSettings,
    reload: loadAll,
  }
}
