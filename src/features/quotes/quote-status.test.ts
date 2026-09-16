import { describe, expect, it } from 'vitest'
import {
  assertQuoteStatusTransition,
  canTransitionQuoteStatus,
  getAvailableQuoteTransitions,
  isQuoteEditable,
} from '@/features/quotes/quote-status'

describe('quote status transitions', () => {
  it('allows the primary happy path', () => {
    expect(canTransitionQuoteStatus('draft', 'sent')).toBe(true)
    expect(canTransitionQuoteStatus('sent', 'accepted')).toBe(true)
  })

  it('allows rejection paths', () => {
    expect(canTransitionQuoteStatus('draft', 'rejected')).toBe(true)
    expect(canTransitionQuoteStatus('sent', 'rejected')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(canTransitionQuoteStatus('accepted', 'draft')).toBe(false)
    expect(canTransitionQuoteStatus('rejected', 'sent')).toBe(false)
    expect(() => assertQuoteStatusTransition('accepted', 'sent')).toThrow()
  })

  it('exposes available transitions and editability', () => {
    expect(getAvailableQuoteTransitions('draft')).toEqual(['sent', 'rejected'])
    expect(isQuoteEditable('draft')).toBe(true)
    expect(isQuoteEditable('sent')).toBe(false)
  })
})
