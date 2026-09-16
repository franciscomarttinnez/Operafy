export const WORK_ORDER_STATUSES = [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  pending: ['scheduled', 'in_progress', 'cancelled'],
  scheduled: ['in_progress', 'cancelled', 'pending'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canTransitionWorkOrderStatus(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): boolean {
  if (from === to) {
    return true
  }
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertWorkOrderStatusTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): void {
  if (!canTransitionWorkOrderStatus(from, to)) {
    throw new Error(`Invalid status transition from ${from} to ${to}`)
  }
}

export function getAvailableWorkOrderTransitions(from: WorkOrderStatus): WorkOrderStatus[] {
  return [...ALLOWED_TRANSITIONS[from]]
}

export function isWorkOrderEditable(status: WorkOrderStatus): boolean {
  return status !== 'completed' && status !== 'cancelled'
}

export function isWorkOrderDeletable(status: WorkOrderStatus): boolean {
  return status === 'pending' || status === 'cancelled'
}
