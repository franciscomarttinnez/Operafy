import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerForm } from '@/features/customers/components/customer-form'
import { useCustomer, useUpdateCustomer } from '@/features/customers/use-customers'
import { useLocale } from '@/i18n/locale-provider'
import { getErrorMessage } from '@/lib/errors'

export function CustomerEditPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const customerQuery = useCustomer(customerId)
  const updateCustomer = useUpdateCustomer(customerId ?? '')
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  if (!customerId) {
    return <p className="text-sm text-destructive">{t('customers.missingId')}</p>
  }

  if (customerQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('customers.loadingOne')}
        </CardContent>
      </Card>
    )
  }

  if (customerQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {customerQuery.error instanceof Error
            ? customerQuery.error.message
            : t('customers.loadOneError')}
        </CardContent>
      </Card>
    )
  }

  if (!customerQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('customers.notFound')}</p>
          <Button asChild variant="outline">
            <Link to="/customers">{t('customers.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const customer = customerQuery.data

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/customers" className="text-primary hover:underline">
            {t('customers.title')}
          </Link>
          <span className="mx-1.5">/</span>
          <Link to={`/customers/${customer.id}`} className="text-primary hover:underline">
            {customer.name}
          </Link>
          <span className="mx-1.5">/</span>
          {t('customers.editBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('customers.editTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers.detailsTitle')}</CardTitle>
          <CardDescription>{t('customers.detailsHintEdit')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <CustomerForm
            initialCustomer={customer}
            submitLabel={t('customers.saveChanges')}
            onCancel={() => navigate(`/customers/${customer.id}`)}
            onSubmit={async (input) => {
              setFormError(null)
              try {
                await updateCustomer.mutateAsync(input)
                navigate(`/customers/${customer.id}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('customers.updateError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
