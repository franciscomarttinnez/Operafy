import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkOrderForm } from '@/features/work-orders/components/work-order-form'
import { useCreateWorkOrder } from '@/features/work-orders/use-work-orders'
import { useCustomers } from '@/features/customers/use-customers'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'

export function WorkOrderNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customerId') ?? undefined
  const createWorkOrder = useCreateWorkOrder()
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
          <CardTitle>{t('workOrders.needCustomerTitle')}</CardTitle>
          <CardDescription>{t('workOrders.needCustomerBody')}</CardDescription>
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
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/work-orders" className="text-primary hover:underline">
            {t('workOrders.title')}
          </Link>
          <span className="mx-1.5">/</span>
          {t('workOrders.newBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('workOrders.newTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('workOrders.detailsTitle')}</CardTitle>
          <CardDescription>{t('workOrders.detailsHintNew')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <WorkOrderForm
            lockCustomerId={presetCustomerId}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('workOrders.create')}
            onCancel={() => navigate('/work-orders')}
            onCreate={async (input) => {
              setFormError(null)
              try {
                const job = await createWorkOrder.mutateAsync(input)
                navigate(`/work-orders/${job.id}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('workOrders.createError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
