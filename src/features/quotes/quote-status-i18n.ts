import type { MessageKey } from '@/i18n/types'
import type { QuoteStatus } from '@/features/quotes/quote-status'

export const quoteStatusLabelKeys: Record<QuoteStatus, MessageKey> = {
  draft: 'quotes.status.draft',
  sent: 'quotes.status.sent',
  accepted: 'quotes.status.accepted',
  rejected: 'quotes.status.rejected',
}
