import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteForm } from '@/features/quotes/components/quote-form'
import { useCustomers } from '@/features/customers/use-customers'
import { useOrganization } from '@/features/organizations/use-organization'
import { useQuote, useUpdateQuote } from '@/features/quotes/use-quotes'
import { isQuoteEditable } from '@/features/quotes/quote-status'
import { useLocale } from '@/i18n/locale-provider'
import { getErrorMessage } from '@/lib/errors'

export function QuoteEditPage() {
  const { quoteId } = useParams<{ quoteId: string }>()
  const navigate = useNavigate()
  const quoteQuery = useQuote(quoteId)
  const customersQuery = useCustomers('')
  const updateQuote = useUpdateQuote(quoteId ?? '')
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  if (!quoteId) {
    return <p className="text-sm text-destructive">{t('quotes.missingId')}</p>
  }

  if (quoteQuery.isLoading || customersQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('quotes.loadingOne')}
        </CardContent>
      </Card>
    )
  }

  if (quoteQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {quoteQuery.error instanceof Error
            ? quoteQuery.error.message
            : t('quotes.loadOneError')}
        </CardContent>
      </Card>
    )
  }

  if (!quoteQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('quotes.notFound')}</p>
          <Button asChild variant="outline">
            <Link to="/quotes">{t('quotes.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isQuoteEditable(quoteQuery.data.status)) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('quotes.onlyDraftEditable')}</p>
          <Button asChild variant="outline">
            <Link to={`/quotes/${quoteQuery.data.id}`}>{t('quotes.backToQuote')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/quotes" className="text-primary hover:underline">
            {t('quotes.title')}
          </Link>
          <span className="mx-1.5">/</span>
          <Link to={`/quotes/${quoteQuery.data.id}`} className="text-primary hover:underline">
            {quoteQuery.data.quote_number}
          </Link>
          <span className="mx-1.5">/</span>
          {t('quotes.editBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('quotes.editTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('quotes.detailsTitle')}</CardTitle>
          <CardDescription>{t('quotes.detailsHintEdit')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <QuoteForm
            customers={customersQuery.data ?? []}
            initialQuote={quoteQuery.data}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('quotes.saveChanges')}
            onCancel={() => navigate(`/quotes/${quoteQuery.data?.id}`)}
            onSubmit={async (input) => {
              setFormError(null)
              try {
                await updateQuote.mutateAsync(input)
                navigate(`/quotes/${quoteId}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('quotes.updateError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
