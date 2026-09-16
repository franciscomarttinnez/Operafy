import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { useQuotes } from '@/features/quotes/use-quotes'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { formatMoney } from '@/lib/money'

export function QuotesListPage() {
  const quotesQuery = useQuotes()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const currency = organization?.default_currency ?? 'USD'

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

      {quotesQuery.isSuccess && quotesQuery.data.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {quotesQuery.data.map((quote) => (
              <Link key={quote.id} to={`/quotes/${quote.id}`} className="block">
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{quote.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.quote_number} ·{' '}
                          {quote.customers?.name ?? t('quotes.customerFallback')}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatMoney(quote.total, currency)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('quotes.colQuote')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colCustomer')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colStatus')}</th>
                    <th className="px-4 py-3 font-medium">{t('quotes.colTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotesQuery.data.map((quote) => (
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
                        {formatMoney(quote.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
