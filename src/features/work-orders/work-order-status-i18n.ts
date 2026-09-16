import type { MessageKey } from '@/i18n/types'
import type { WorkOrderStatus } from '@/features/work-orders/work-order-status'

export const workOrderStatusLabelKeys: Record<WorkOrderStatus, MessageKey> = {
  pending: 'workOrders.status.pending',
  scheduled: 'workOrders.status.scheduled',
  in_progress: 'workOrders.status.inProgress',
  completed: 'workOrders.status.completed',
  cancelled: 'workOrders.status.cancelled',
}
