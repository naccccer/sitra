import { describe, expect, it } from 'vitest'
import { shamsiMonthKeyToGregorianRange } from '../../src/modules/accounting/utils/dateUtils'

describe('shamsiMonthKeyToGregorianRange', () => {
  it('converts a shamsi month key to a gregorian date range', () => {
    const range = shamsiMonthKeyToGregorianRange('1403-12')

    expect(range).toEqual({
      startDate: '2025-02-19',
      endDate: '2025-03-20',
    })
  })
})
