import { describe, expect, it } from 'vitest'
import {
  buildFormulaConfigFromCatalog,
  calculateCatalogTotals,
  resolveCatalogDisplayValue,
} from '../../src/modules/accounting/components/payroll/payrollCatalog'

describe('payrollCatalog formulas', () => {
  it('builds a rate-times-quantity expression for configurable overtime', () => {
    const formulaConfig = buildFormulaConfigFromCatalog([
      { key: 'overtimeHours', label: 'ساعت اضافه کاری', type: 'work', source: 'overtimeHours', sortOrder: 10, active: true },
      {
        key: 'overtimePay',
        label: 'مبلغ اضافه کاری',
        type: 'earning',
        source: 'overtimePay',
        calcMode: 'rate_x_quantity',
        quantitySource: 'overtimeHours',
        rateMode: 'fixed',
        rateValue: 150000,
        sortOrder: 20,
        active: true,
      },
    ])

    expect(formulaConfig.items).toEqual([
      expect.objectContaining({
        key: 'overtimePay',
        expression: 'overtimeHours * 150000',
      }),
    ])
  })

  it('builds expression from select-based formula builder', () => {
    const formulaConfig = buildFormulaConfigFromCatalog([
      {
        key: 'tax',
        label: 'tax',
        type: 'deduction',
        source: 'tax',
        calcMode: 'formula',
        formulaBaseMode: 'number',
        formulaBaseValue: 10,
        formulaSteps: [
          {
            operator: 'percent_of',
            operandMode: 'source',
            operandSource: 'grossPay',
          },
        ],
        sortOrder: 10,
        active: true,
      },
    ])

    expect(formulaConfig.items).toEqual([
      expect.objectContaining({
        key: 'tax',
        expression: '((10) * (grossPay) / 100)',
      }),
    ])
  })

  it('resolves computed values and totals from formulas in the UI preview', () => {
    const catalog = [
      { key: 'overtimeHours', label: 'ساعت اضافه کاری', type: 'work', source: 'overtimeHours', sortOrder: 10, active: true },
      {
        key: 'overtimePay',
        label: 'مبلغ اضافه کاری',
        type: 'earning',
        source: 'overtimePay',
        calcMode: 'rate_x_quantity',
        quantitySource: 'overtimeHours',
        rateMode: 'fixed',
        rateValue: 200000,
        sortOrder: 20,
        active: true,
      },
      {
        key: 'tax',
        label: 'مالیات',
        type: 'deduction',
        source: 'tax',
        calcMode: 'formula',
        formulaBaseMode: 'number',
        formulaBaseValue: 10,
        formulaSteps: [
          {
            operator: 'percent_of',
            operandMode: 'source',
            operandSource: 'overtimePay',
          },
        ],
        sortOrder: 30,
        active: true,
      },
    ]

    const payslip = {
      overtimeHours: 5,
      inputs: { overtimeHours: 5 },
    }

    expect(resolveCatalogDisplayValue(payslip, catalog, catalog[1])).toBe(1000000)
    expect(resolveCatalogDisplayValue(payslip, catalog, catalog[2])).toBe(100000)
    expect(calculateCatalogTotals(payslip, catalog)).toEqual({
      gross: 1000000,
      deductions: 100000,
      net: 900000,
    })
  })
})
