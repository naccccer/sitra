import { useState } from 'react'

const STEPS = ['period', 'entry_review', 'finalize']

function fallbackCountsFromRun(selectedRun) {
  const payslips = Array.isArray(selectedRun?.payslips) ? selectedRun.payslips : []
  return payslips.reduce((result, payslip) => {
    const status = String(payslip?.status || 'draft')
    result.payslipCount += 1
    if (status === 'issued') result.finalizedPayslips += 1
    if (status === 'cancelled') result.cancelledPayslips += 1
    if (status === 'draft' || status === 'approved') result.readyToFinalize += 1
    return result
  }, {
    payslipCount: 0,
    readyToFinalize: 0,
    finalizedPayslips: 0,
    cancelledPayslips: 0,
    rowsWithErrors: 0,
    incompletePayslips: 0,
  })
}

function buildFallbackWorkspace(selectedRun) {
  const counts = fallbackCountsFromRun(selectedRun)
  const isFinalized = counts.payslipCount > 0 && (counts.finalizedPayslips + counts.cancelledPayslips) === counts.payslipCount
  const canFinalize = counts.payslipCount > 0 && !isFinalized && counts.readyToFinalize > 0
  const blockers = counts.payslipCount > 0
    ? []
    : [{ step: 'entry_review', code: 'no_payslips', message: 'برای این دوره هنوز فیشی ثبت نشده است.' }]
  return {
    workflowState: isFinalized ? 'finalized' : (canFinalize ? 'ready_to_finalize' : 'in_progress'),
    finalizationReadiness: { canFinalize, counts, blockers },
    stepStatus: {
      period: 'ready',
      entry_review: counts.payslipCount > 0 ? 'ready' : 'blocked',
      finalize: isFinalized ? 'completed' : (canFinalize ? 'ready' : 'blocked'),
    },
    blockers,
  }
}

export function usePayrollWorkflow(selectedRun, workspace) {
  const [internalStep, setInternalStep] = useState('period')

  const normalized = selectedRun?.id ? (workspace || buildFallbackWorkspace(selectedRun)) : null

  const blockers = !selectedRun?.id
    ? [
      { step: 'period', code: 'no_period', message: 'ابتدا یک دوره حقوق انتخاب کنید.' },
      { step: 'entry_review', code: 'no_period', message: 'برای ورود و بازبینی اطلاعات، دوره انتخاب نشده است.' },
      { step: 'finalize', code: 'no_period', message: 'برای نهایی‌سازی، دوره انتخاب نشده است.' },
    ]
    : (Array.isArray(normalized?.blockers) ? normalized.blockers : []).map((item) => ({ ...item, step: item?.step || 'finalize' }))

  const blockersByStep = { period: [], entry_review: [], finalize: [] }
  blockers.forEach((blocker) => {
    if (blockersByStep[blocker.step]) blockersByStep[blocker.step].push(blocker)
  })

  const stepStatus = !selectedRun?.id
    ? { period: 'blocked', entry_review: 'blocked', finalize: 'blocked' }
    : {
      period: normalized?.stepStatus?.period || 'ready',
      entry_review: normalized?.stepStatus?.entry_review || 'blocked',
      finalize: normalized?.stepStatus?.finalize || 'blocked',
    }

  const currentStep = selectedRun?.id ? internalStep : 'period'

  const canAdvance = (step = currentStep) => {
    if (!selectedRun?.id) return false
    if (stepStatus[step] === 'blocked') return false
    return (blockersByStep[step]?.length || 0) === 0
  }

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
    workflowState: normalized?.workflowState || 'in_progress',
    finalizationReadiness: normalized?.finalizationReadiness || { canFinalize: false, counts: {}, blockers: [] },
    checklist: Array.isArray(normalized?.checklist) ? normalized.checklist : [],
    canAdvance,
    goNext,
    goPrev,
  }
}