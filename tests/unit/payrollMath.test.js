import { describe, expect, it } from 'vitest'
import { resolvePayslipTotals } from '../../src/modules/accounting/components/payroll/payrollMath'

describe('resolvePayslipTotals', () => {
  it('is deterministic for identical input without mutating the source payload', () => {
    const payload = {
      baseSalary: 3200000,
      bonus: 300000,
      tax: 250000,
      insurance: 120000,
      payments: [{ amount: 500000 }],
    }

    const inputClone = JSON.parse(JSON.stringify(payload))
    const first = resolvePayslipTotals(payload)
    const second = resolvePayslipTotals(payload)

    expect(payload).toEqual(inputClone)
    expect(second).toEqual(first)
  })

  it('returns gross, deductions, net, paid, and due totals for a simple payslip payload', () => {
    const result = resolvePayslipTotals({
      baseSalary: 2000000,
      bonus: 500000,
      tax: 300000,
    })

    expect(result).toEqual({
      gross: 2500000,
      deductions: 300000,
      net: 2200000,
      paid: 0,
      due: 2200000,
    })
  })
})
