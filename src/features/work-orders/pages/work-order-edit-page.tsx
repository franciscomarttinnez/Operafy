import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkOrderForm } from '@/features/work-orders/components/work-order-form'
import { useOrganization } from '@/features/organizations/use-organization'
import { useUpdateWorkOrder, useWorkOrder } from '@/features/work-orders/use-work-orders'
import { isWorkOrderEditable } from '@/features/work-orders/work-order-status'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'

export function WorkOrderEditPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>()
  const navigate = useNavigate()
  const workOrderQuery = useWorkOrder(workOrderId)
  const updateWorkOrder = useUpdateWorkOrder(workOrderId ?? '')
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  if (!workOrderId) {
    return <p className="text-sm text-destructive">{t('workOrders.missingId')}</p>
  }

  if (workOrderQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('workOrders.loadingOne')}
        </CardContent>
      </Card>
    )
  }

  if (workOrderQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {workOrderQuery.error instanceof Error
            ? workOrderQuery.error.message
            : t('workOrders.loadOneError')}
        </CardContent>
      </Card>
    )
  }

  if (!workOrderQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('workOrders.notFound')}</p>
          <Button asChild variant="outline">
            <Link to="/work-orders">{t('workOrders.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isWorkOrderEditable(workOrderQuery.data.status)) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('workOrders.onlyOpenEditable')}</p>
          <Button asChild variant="outline">
            <Link to={`/work-orders/${workOrderQuery.data.id}`}>{t('workOrders.backToJob')}</Link>
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
          <Link
            to={`/work-orders/${workOrderQuery.data.id}`}
            className="text-primary hover:underline"
          >
            {workOrderQuery.data.title}
          </Link>
          <span className="mx-1.5">/</span>
          {t('workOrders.editBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('workOrders.editTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('workOrders.detailsTitle')}</CardTitle>
          <CardDescription>{t('workOrders.detailsHintEdit')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <WorkOrderForm
            initialWorkOrder={workOrderQuery.data}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('workOrders.saveChanges')}
            onCancel={() => navigate(`/work-orders/${workOrderQuery.data?.id}`)}
            onUpdate={async (input) => {
              setFormError(null)
              try {
                await updateWorkOrder.mutateAsync(input)
                navigate(`/work-orders/${workOrderId}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('workOrders.updateError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
