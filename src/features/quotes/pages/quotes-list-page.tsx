import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListFilters } from '@/components/list-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { quoteStatusLabelKeys } from '@/features/quotes/quote-status-i18n'
import {
  isQuoteDeletable,
  QUOTE_STATUSES,
  type QuoteStatus,
} from '@/features/quotes/quote-status'
import { useDeleteQuote, useQuotes } from '@/features/quotes/use-quotes'
import { useOrganization } from '@/features/organizations/use-organization'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { matchesSearchQuery } from '@/lib/search'

type QuoteListFilter = QuoteStatus | 'all' | 'open'

function parseQuoteFilter(value: string | null): QuoteListFilter {
  if (value === 'open') {
    return 'open'
  }
  if (value && (QUOTE_STATUSES as readonly string[]).includes(value)) {
    return value as QuoteStatus
  }
  return 'all'
}

function matchesQuoteFilter(status: QuoteStatus, filter: QuoteListFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'open') {
    return status === 'draft' || status === 'sent'
  }
  return status === filter
}

export function QuotesListPage() {
  const quotesQuery = useQuotes()
  const deleteQuote = useDeleteQuote()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const search = useDebouncedValue(searchInput, 250)
  const statusFilter = parseQuoteFilter(searchParams.get('status'))
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const [pendingDelete, setPendingDelete] = useState<{ id: string; number: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredQuotes = useMemo(() => {
    const rows = quotesQuery.data ?? []
    return rows.filter((quote) => {
      if (!matchesQuoteFilter(quote.status, statusFilter)) {
        return false
      }
      return matchesSearchQuery(
        search,
        quote.quote_number,
        quote.title,
        quote.customers?.name,
      )
    })
  }, [quotesQuery.data, search, statusFilter])

  const setStatusFilter = (value: QuoteListFilter) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete('status')
    } else {
      next.set('status', value)
    }
    setSearchParams(next, { replace: true })
  }

  const mapDeleteError = (error: unknown) => {
    const message = getErrorMessage(error, t('quotes.deleteError'))
    const lower = message.toLowerCase()
    if (lower.includes('work order') || lower.includes('linked')) {
      return t('quotes.deleteBlockedJobs')
    }
    if (lower.includes('draft') || lower.includes('rejected') || lower.includes('only')) {
      return t('quotes.deleteBlocked')
    }
    return message
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('quotes.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('quotes.subtitle')}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/quotes/new">
            <Plus className="h-4 w-4" />
            {t('quotes.new')}
          </Link>
        </Button>
      </div>

      {quotesQuery.isSuccess && quotesQuery.data.length > 0 ? (
        <ListFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('quotes.search')}
          searchLabel={t('quotes.search')}
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: t('common.all') },
            { value: 'open', label: t('quotes.filterOpen') },
            ...QUOTE_STATUSES.map((status) => ({
              value: status,
              label: t(quoteStatusLabelKeys[status]),
            })),
          ]}
        />
      ) : null}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {quotesQuery.isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('quotes.loading')}
          </CardContent>
        </Card>
      ) : null}

      {quotesQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {quotesQuery.error instanceof Error
              ? quotesQuery.error.message
              : t('quotes.loadError')}
          </CardContent>
        </Card>
      ) : null}

      {quotesQuery.isSuccess && quotesQuery.data.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium text-foreground">{t('quotes.empty')}</p>
            <p className="text-sm text-muted-foreground">{t('quotes.emptyHint')}</p>
            <Button asChild>
              <Link to="/quotes/new">{t('quotes.new')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {quotesQuery.isSuccess && quotesQuery.data.length > 0 && filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="font-medium text-foreground">{t('quotes.noMatches')}</p>
            <p className="text-sm text-muted-foreground">{t('common.noMatchesHint')}</p>
          </CardContent>
        </Card>
      ) : null}

      {quotesQuery.isSuccess && filteredQuotes.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {filteredQuotes.map((quote) => (
              <Card
                key={quote.id}
                className="transition-colors active:bg-accent/50 md:transition-all md:hover:-translate-y-0.5 md:hover:shadow-md"
              >
                <CardContent className="space-y-3 p-4">
                  <Link
                    to={`/quotes/${quote.id}`}
                    className="touch-card block space-y-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{quote.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.quote_number} ·{' '}
                          {quote.customers?.name ?? t('quotes.customerFallback')}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatMoney(quote.total, currency, moneyLocale)}
                    </p>
                  </Link>
                  {isQuoteDeletable(quote.status) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleteQuote.isPending}
                      onClick={() => {
                        setActionError(null)
                        setPendingDelete({ id: quote.id, number: quote.quote_number })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('quotes.colQuote')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colCustomer')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colStatus')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colTotal')}</th>
                    <th className="px-4 py-3 font-medium">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/quotes/${quote.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {quote.quote_number}
                        </Link>
                        <p className="text-xs text-muted-foreground">{quote.title}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {quote.customers?.name ?? t('common.emDash')}
                      </td>
                      <td className="px-4 py-3">
                        <QuoteStatusBadge status={quote.status} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(quote.total, currency, moneyLocale)}
                      </td>
                      <td className="px-4 py-3">
                        {isQuoteDeletable(quote.status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleteQuote.isPending}
                            onClick={() => {
                              setActionError(null)
                              setPendingDelete({ id: quote.id, number: quote.quote_number })
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('common.emDash')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">{t('quotes.showingUpTo')}</p>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.delete')}
        description={t('quotes.deleteConfirm', { number: pendingDelete?.number ?? '' })}
        confirmLabel={deleteQuote.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={deleteQuote.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return
          }
          const target = pendingDelete
          setActionError(null)
          void deleteQuote
            .mutateAsync(target.id)
            .then(() => setPendingDelete(null))
            .catch((error: unknown) => {
              console.error(error)
              setPendingDelete(null)
              setActionError(mapDeleteError(error))
            })
        }}
      />
    </div>
  )
}
