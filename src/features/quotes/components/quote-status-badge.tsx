import { useLocale } from '@/i18n/locale-provider'
import { quoteStatusLabelKeys } from '@/features/quotes/quote-status-i18n'
import { cn } from '@/lib/utils'
import type { QuoteStatus } from '@/features/quotes/quote-status'

const statusStyles: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { t } = useLocale()

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
      )}
    >
      {t(quoteStatusLabelKeys[status])}
    </span>
  )
}
