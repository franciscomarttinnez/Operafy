import { describe, expect, it } from 'vitest'
import {
  assertWorkOrderStatusTransition,
  canTransitionWorkOrderStatus,
  getAvailableWorkOrderTransitions,
  isWorkOrderDeletable,
  isWorkOrderEditable,
} from '@/features/work-orders/work-order-status'

describe('work order status transitions', () => {
  it('allows the primary happy path', () => {
    expect(canTransitionWorkOrderStatus('pending', 'scheduled')).toBe(true)
    expect(canTransitionWorkOrderStatus('scheduled', 'in_progress')).toBe(true)
    expect(canTransitionWorkOrderStatus('in_progress', 'completed')).toBe(true)
  })

  it('allows cancellation from open states', () => {
    expect(canTransitionWorkOrderStatus('pending', 'cancelled')).toBe(true)
    expect(canTransitionWorkOrderStatus('scheduled', 'cancelled')).toBe(true)
    expect(canTransitionWorkOrderStatus('in_progress', 'cancelled')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(canTransitionWorkOrderStatus('completed', 'pending')).toBe(false)
    expect(canTransitionWorkOrderStatus('cancelled', 'in_progress')).toBe(false)
    expect(() => assertWorkOrderStatusTransition('completed', 'in_progress')).toThrow()
  })

  it('exposes editability and available transitions', () => {
    expect(getAvailableWorkOrderTransitions('pending')).toEqual([
      'scheduled',
      'in_progress',
      'cancelled',
    ])
    expect(isWorkOrderEditable('pending')).toBe(true)
    expect(isWorkOrderEditable('completed')).toBe(false)
    expect(isWorkOrderDeletable('pending')).toBe(true)
    expect(isWorkOrderDeletable('in_progress')).toBe(false)
  })
})
