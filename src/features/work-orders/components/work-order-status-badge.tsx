import { useLocale } from '@/i18n/use-locale'
import { workOrderStatusLabelKeys } from '@/features/work-orders/work-order-status-i18n'
import { cn } from '@/lib/utils'
import type { WorkOrderStatus } from '@/features/work-orders/work-order-status'

const statusStyles: Record<WorkOrderStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  in_progress: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useLocale()

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
      )}
    >
      {t(workOrderStatusLabelKeys[status])}
    </span>
  )
}
