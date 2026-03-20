import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePayrollWorkflow } from '../../src/modules/accounting/hooks/usePayrollWorkflow'

describe('usePayrollWorkflow', () => {
  it('returns period blockers when no run is selected', () => {
    const { result } = renderHook(() => usePayrollWorkflow(null))

    expect(result.current.currentStep).toBe('period')
    expect(result.current.stepStatus.period).toBe('blocked')
    expect(result.current.canAdvance('period')).toBe(false)
    expect(result.current.blockers.some((item) => item.code === 'no_period')).toBe(true)
  })

  it('computes actionable counts and step transitions for a valid run', () => {
    const run = {
      id: 'run-1',
      payslips: [
        { id: '1', status: 'draft', net: 1000, due: 1000 },
        { id: '2', status: 'approved', net: 2000, due: 2000 },
        { id: '3', status: 'issued', net: 3000, due: 1500 },
      ],
    }
    const { result } = renderHook(() => usePayrollWorkflow(run))

    expect(result.current.actionableCounts.total).toBe(3)
    expect(result.current.actionableCounts.approveEligible).toBe(1)
    expect(result.current.actionableCounts.issueEligible).toBe(1)
    expect(result.current.actionableCounts.paymentEligible).toBe(1)
    expect(result.current.canAdvance('period')).toBe(true)

    act(() => result.current.goNext())
    expect(result.current.currentStep).toBe('prepare')

    act(() => result.current.goNext())
    expect(result.current.currentStep).toBe('approve_issue')
  })
})
