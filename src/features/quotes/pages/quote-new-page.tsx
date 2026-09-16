import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuoteForm } from '@/features/quotes/components/quote-form'
import { useCreateQuote } from '@/features/quotes/use-quotes'
import { useCustomers } from '@/features/customers/use-customers'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { getErrorMessage } from '@/lib/errors'

export function QuoteNewPage() {
  const navigate = useNavigate()
  const createQuote = useCreateQuote()
  const customersQuery = useCustomers('')
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  if (customersQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('customers.loading')}
        </CardContent>
      </Card>
    )
  }

  if (customersQuery.isSuccess && customersQuery.data.length === 0) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t('quotes.needCustomerTitle')}</CardTitle>
          <CardDescription>{t('quotes.needCustomerBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/customers/new">{t('customers.add')}</Link>
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
          {t('quotes.newBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('quotes.newTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('quotes.detailsTitle')}</CardTitle>
          <CardDescription>{t('quotes.detailsHintNew')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <QuoteForm
            customers={customersQuery.data ?? []}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('quotes.create')}
            onCancel={() => navigate('/quotes')}
            onSubmit={async (input) => {
              setFormError(null)
              try {
                const quote = await createQuote.mutateAsync(input)
                navigate(`/quotes/${quote.id}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('quotes.createError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
