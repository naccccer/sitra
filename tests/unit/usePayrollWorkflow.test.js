import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePayrollWorkflow } from '../../src/modules/accounting/hooks/usePayrollWorkflow'

describe('usePayrollWorkflow', () => {
  it('returns period blockers when no run is selected', () => {
    const { result } = renderHook(() => usePayrollWorkflow(null, null))

    expect(result.current.currentStep).toBe('period')
    expect(result.current.stepStatus.period).toBe('blocked')
    expect(result.current.canAdvance('period')).toBe(false)
    expect(result.current.blockers.some((item) => item.code === 'no_period')).toBe(true)
  })

  it('uses workspace readiness for step states', () => {
    const run = { id: 'run-1', payslips: [{ id: '1', status: 'draft' }] }
    const workspace = {
      workflowState: 'ready_to_finalize',
      stepStatus: { period: 'ready', entry_review: 'ready', finalize: 'ready' },
      blockers: [],
      checklist: [{ id: 'has_payslips', ok: true, value: 1 }],
      finalizationReadiness: {
        canFinalize: true,
        counts: { payslipCount: 1, readyToFinalize: 1 },
        blockers: [],
      },
    }

    const { result } = renderHook(() => usePayrollWorkflow(run, workspace))

    expect(result.current.workflowState).toBe('ready_to_finalize')
    expect(result.current.stepStatus.finalize).toBe('ready')
    expect(result.current.finalizationReadiness.canFinalize).toBe(true)
    expect(result.current.canAdvance('entry_review')).toBe(true)

    act(() => result.current.goNext())
    expect(result.current.currentStep).toBe('entry_review')
  })

  it('marks finalize step completed for finalized workspace', () => {
    const run = { id: 'run-2', payslips: [{ id: '1', status: 'issued' }] }
    const workspace = {
      workflowState: 'finalized',
      stepStatus: { period: 'ready', entry_review: 'ready', finalize: 'completed' },
      blockers: [],
      checklist: [],
      finalizationReadiness: {
        canFinalize: false,
        counts: { payslipCount: 1, finalizedPayslips: 1 },
        blockers: [],
      },
    }

    const { result } = renderHook(() => usePayrollWorkflow(run, workspace))

    expect(result.current.workflowState).toBe('finalized')
    expect(result.current.stepStatus.finalize).toBe('completed')
  })
})
