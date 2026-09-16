import { describe, expect, it } from 'vitest'
import {
  calculateLineTotalMinor,
  calculatePaymentBalance,
  calculateQuoteTotals,
  sumPaymentAmountsMinor,
  toMinorUnits,
} from '@/lib/money'

describe('money helpers', () => {
  it('converts major units to minor units', () => {
    expect(toMinorUnits(205.5)).toBe(20550)
    expect(toMinorUnits(90)).toBe(9000)
  })

  it('calculates line totals with integer money', () => {
    expect(calculateLineTotalMinor(2, 4000)).toBe(8000)
    expect(calculateLineTotalMinor(1.5, 1000)).toBe(1500)
  })

  it('calculates quote totals with tax and discount', () => {
    const totals = calculateQuoteTotals({
      lines: [
        { description: 'Labor', quantity: 1, unitPriceMinor: 9000 },
        { description: 'Part', quantity: 2, unitPriceMinor: 3500 },
      ],
      taxAmountMinor: 500,
      discountAmountMinor: 1000,
    })

    expect(totals.subtotalMinor).toBe(16000)
    expect(totals.totalMinor).toBe(15500)
  })

  it('rejects invalid discount', () => {
    expect(() =>
      calculateQuoteTotals({
        lines: [{ description: 'Labor', quantity: 1, unitPriceMinor: 1000 }],
        discountAmountMinor: 5000,
      }),
    ).toThrow(/Discount cannot exceed/)
  })

  it('calculates payment balances with partial payments', () => {
    expect(calculatePaymentBalance(20000, 5000)).toEqual({
      billableMinor: 20000,
      paidMinor: 5000,
      balanceMinor: 15000,
    })
    expect(sumPaymentAmountsMinor([5000, 2500])).toBe(7500)
  })
})
