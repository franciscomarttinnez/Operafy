import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerForm } from '@/features/customers/components/customer-form'
import { useCreateCustomer } from '@/features/customers/use-customers'
import { useLocale } from '@/i18n/locale-provider'
import { getErrorMessage } from '@/lib/errors'

export function CustomerNewPage() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/customers" className="text-primary hover:underline">
            {t('customers.title')}
          </Link>
          <span className="mx-1.5">/</span>
          {t('customers.newBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('customers.add')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers.detailsTitle')}</CardTitle>
          <CardDescription>{t('customers.detailsHintNew')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <CustomerForm
            submitLabel={t('customers.create')}
            onCancel={() => navigate('/customers')}
            onSubmit={async (input) => {
              setFormError(null)
              try {
                const customer = await createCustomer.mutateAsync(input)
                navigate(`/customers/${customer.id}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('customers.createError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
