import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePayroll } from '../../src/modules/accounting/hooks/usePayroll'

vi.mock('../../src/modules/accounting/services/accountingApi', () => ({
  accountingApi: {
    fetchPayrollEmployees: vi.fn(async () => ({ employees: [] })),
    fetchPayrollPeriods: vi.fn(async () => ({ periods: [] })),
    fetchPayrollPayslips: vi.fn(async () => ({ payslips: [], totalPages: 1 })),
    fetchPayrollSettings: vi.fn(async () => ({ success: true, value: null })),
  },
}))

vi.mock('../../src/modules/accounting/components/payroll/payrollMath', () => ({
  buildPayrollRun: vi.fn((period, payslips) => ({
    id: period?.id ?? '',
    period,
    payslips,
    summary: { net: 0, due: 0 },
  })),
  normalizePayrollDetailPayslip: vi.fn((value) => value),
  normalizePayrollEmployee: vi.fn((value) => value),
  normalizePayrollListPayslip: vi.fn((value) => value),
  normalizePayrollPeriod: vi.fn((value) => value),
  safeNumber: vi.fn((value) => Number(value) || 0),
}))

import { accountingApi } from '../../src/modules/accounting/services/accountingApi'

describe('usePayroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads payroll settings during boot', async () => {
    const { result } = renderHook(() => usePayroll())

    await waitFor(() => {
      expect(accountingApi.fetchPayrollEmployees).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(accountingApi.fetchPayrollEmployees).toHaveBeenCalledTimes(1)
    expect(accountingApi.fetchPayrollEmployees).toHaveBeenCalledWith({ isActive: true })
    expect(accountingApi.fetchPayrollPeriods).toHaveBeenCalledTimes(1)
    expect(accountingApi.fetchPayrollPayslips).toHaveBeenCalledTimes(1)
    expect(accountingApi.fetchPayrollSettings).toHaveBeenCalledTimes(1)
  })
})
