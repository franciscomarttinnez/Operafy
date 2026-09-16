/** Money helpers — amounts are integer minor units (cents). */

export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount)) {
    throw new Error('Amount must be a finite number.')
  }
  return Math.round(majorAmount * 100)
}

export function fromMinorUnits(minorAmount: number): number {
  if (!Number.isFinite(minorAmount)) {
    throw new Error('Amount must be a finite number.')
  }
  return minorAmount / 100
}

export function parseMajorAmountInput(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (normalized.length === 0) {
    throw new Error('Amount is required.')
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Enter a valid amount greater than or equal to 0.')
  }
  return parsed
}

export function formatMoney(
  minorAmount: number,
  currencyCode = 'USD',
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(fromMinorUnits(minorAmount))
}

export type QuoteLineInput = {
  description: string
  quantity: number
  unitPriceMinor: number
}

export type QuoteTotalsInput = {
  lines: QuoteLineInput[]
  taxAmountMinor?: number
  discountAmountMinor?: number
}

export type QuoteTotals = {
  lines: Array<QuoteLineInput & { lineTotalMinor: number }>
  subtotalMinor: number
  taxAmountMinor: number
  discountAmountMinor: number
  totalMinor: number
}

export function calculateLineTotalMinor(quantity: number, unitPriceMinor: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than 0.')
  }
  if (!Number.isFinite(unitPriceMinor) || unitPriceMinor < 0 || !Number.isInteger(unitPriceMinor)) {
    throw new Error('Unit price must be a non-negative integer in minor units.')
  }
  return Math.round(quantity * unitPriceMinor)
}

export function calculateQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  if (input.lines.length === 0) {
    throw new Error('At least one line item is required.')
  }

  const taxAmountMinor = input.taxAmountMinor ?? 0
  const discountAmountMinor = input.discountAmountMinor ?? 0

  if (!Number.isInteger(taxAmountMinor) || taxAmountMinor < 0) {
    throw new Error('Tax must be a non-negative integer in minor units.')
  }
  if (!Number.isInteger(discountAmountMinor) || discountAmountMinor < 0) {
    throw new Error('Discount must be a non-negative integer in minor units.')
  }

  const lines = input.lines.map((line) => {
    if (!line.description.trim()) {
      throw new Error('Each line item needs a description.')
    }
    const lineTotalMinor = calculateLineTotalMinor(line.quantity, line.unitPriceMinor)
    return {
      description: line.description.trim(),
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor,
    }
  })

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0)

  if (discountAmountMinor > subtotalMinor + taxAmountMinor) {
    throw new Error('Discount cannot exceed subtotal + tax.')
  }

  return {
    lines,
    subtotalMinor,
    taxAmountMinor,
    discountAmountMinor,
    totalMinor: subtotalMinor - discountAmountMinor + taxAmountMinor,
  }
}

export type PaymentBalance = {
  billableMinor: number
  paidMinor: number
  balanceMinor: number
}

export function calculatePaymentBalance(
  billableMinor: number,
  paidMinor: number,
): PaymentBalance {
  if (!Number.isInteger(billableMinor) || billableMinor < 0) {
    throw new Error('Billable amount must be a non-negative integer in minor units.')
  }
  if (!Number.isInteger(paidMinor) || paidMinor < 0) {
    throw new Error('Paid amount must be a non-negative integer in minor units.')
  }

  return {
    billableMinor,
    paidMinor,
    balanceMinor: billableMinor - paidMinor,
  }
}

export function sumPaymentAmountsMinor(amounts: number[]): number {
  return amounts.reduce((sum, amount) => {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Each payment amount must be a non-negative integer in minor units.')
    }
    return sum + amount
  }, 0)
}
