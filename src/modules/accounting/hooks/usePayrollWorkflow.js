import { useMemo, useState } from 'react'
import { safeNumber } from '../components/payroll/payrollMath'

const STEPS = ['period', 'prepare', 'approve_issue', 'payments']

export function usePayrollWorkflow(selectedRun) {
  const [internalStep, setInternalStep] = useState('period')

  const counts = useMemo(() => {
    const payslips = Array.isArray(selectedRun?.payslips) ? selectedRun.payslips : []
    return payslips.reduce((result, payslip) => {
      const status = String(payslip?.status || 'draft')
      const due = safeNumber(payslip?.due ?? payslip?.totals?.balanceDue)
      const net = safeNumber(payslip?.net ?? payslip?.totals?.netTotal)
      result.total += 1
      result.net += net
      result.due += due
      if (status === 'draft') result.draft += 1
      if (status === 'approved') result.approved += 1
      if (status === 'issued') {
        result.issued += 1
        if (due > 0) result.unpaidIssued += 1
      }
      if (status === 'cancelled') result.cancelled += 1
      return result
    }, {
      total: 0,
      draft: 0,
      approved: 0,
      issued: 0,
      cancelled: 0,
      unpaidIssued: 0,
      net: 0,
      due: 0,
    })
  }, [selectedRun])

  const blockers = useMemo(() => {
    if (!selectedRun?.id) {
      return [
        { step: 'period', code: 'no_period', message: 'ابتدا یک دوره حقوق انتخاب کنید.' },
        { step: 'prepare', code: 'no_period', message: 'برای ورود به آماده سازی، دوره انتخاب نشده است.' },
        { step: 'approve_issue', code: 'no_period', message: 'برای تایید و صدور، دوره انتخاب نشده است.' },
        { step: 'payments', code: 'no_period', message: 'برای پرداخت، دوره انتخاب نشده است.' },
      ]
    }
    const nextBlockers = []
    if (counts.total === 0) {
      nextBlockers.push({ step: 'prepare', code: 'no_payslips', message: 'برای این دوره هنوز فیشی ثبت نشده است.' })
    }
    if ((counts.draft + counts.approved) === 0 && counts.issued === 0) {
      nextBlockers.push({ step: 'approve_issue', code: 'no_actionable_payslips', message: 'فیشی برای تایید یا صدور وجود ندارد.' })
    }
    if (counts.issued === 0) {
      nextBlockers.push({ step: 'payments', code: 'no_issued_payslips', message: 'ابتدا حداقل یک فیش را صادر کنید.' })
    }
    return nextBlockers
  }, [counts, selectedRun?.id])

  const stepStatus = useMemo(() => ({
    period: selectedRun?.id ? 'ready' : 'blocked',
    prepare: counts.total > 0 ? 'ready' : selectedRun?.id ? 'blocked' : 'blocked',
    approve_issue: (counts.draft + counts.approved) > 0 ? 'ready' : counts.issued > 0 ? 'completed' : 'blocked',
    payments: counts.issued > 0 ? (counts.unpaidIssued > 0 ? 'ready' : 'completed') : 'blocked',
  }), [counts, selectedRun?.id])

  const actionableCounts = useMemo(() => ({
    ...counts,
    approveEligible: counts.draft,
    issueEligible: counts.approved,
    paymentEligible: counts.unpaidIssued,
  }), [counts])

  const blockersByStep = useMemo(() => {
    const grouped = { period: [], prepare: [], approve_issue: [], payments: [] }
    blockers.forEach((blocker) => {
      if (grouped[blocker.step]) grouped[blocker.step].push(blocker)
    })
    return grouped
  }, [blockers])

  const currentStep = selectedRun?.id ? internalStep : 'period'
  const canAdvance = (step = currentStep) => (blockersByStep[step]?.length || 0) === 0

  const goNext = () => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < 0 || currentIndex >= STEPS.length - 1 || !canAdvance(currentStep)) return
    setInternalStep(STEPS[currentIndex + 1])
  }

  const goPrev = () => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex <= 0) return
    setInternalStep(STEPS[currentIndex - 1])
  }

  return {
    steps: STEPS,
    currentStep,
    setCurrentStep: setInternalStep,
    stepStatus,
    blockers,
    blockersByStep,
    actionableCounts,
    canAdvance,
    goNext,
    goPrev,
  }
}
