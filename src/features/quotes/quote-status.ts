export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ['sent', 'rejected'],
  sent: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
}

export function canTransitionQuoteStatus(
  from: QuoteStatus,
  to: QuoteStatus,
): boolean {
  if (from === to) {
    return true
  }
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertQuoteStatusTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!canTransitionQuoteStatus(from, to)) {
    throw new Error(`Invalid status transition from ${from} to ${to}`)
  }
}

export function getAvailableQuoteTransitions(from: QuoteStatus): QuoteStatus[] {
  return [...ALLOWED_TRANSITIONS[from]]
}

export function isQuoteEditable(status: QuoteStatus): boolean {
  return status === 'draft'
}
