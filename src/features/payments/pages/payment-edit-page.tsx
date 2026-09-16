import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentForm } from '@/features/payments/components/payment-form'
import { usePayment, usePaidByWorkOrderId, useUpdatePayment } from '@/features/payments/use-payments'
import { useWorkOrders } from '@/features/work-orders/use-work-orders'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'

export function PaymentEditPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const navigate = useNavigate()
  const paymentQuery = usePayment(paymentId)
  const workOrdersQuery = useWorkOrders()
  const { paidByWorkOrderId, isLoading: paymentsLoading } = usePaidByWorkOrderId()
  const updatePayment = useUpdatePayment(paymentId ?? '')
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  if (!paymentId) {
    return <p className="text-sm text-destructive">{t('payments.missingId')}</p>
  }

  if (
    paymentQuery.isLoading ||
    workOrdersQuery.isLoading ||
    paymentsLoading
  ) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('payments.loading')}
        </CardContent>
      </Card>
    )
  }

  if (paymentQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {paymentQuery.error instanceof Error
            ? paymentQuery.error.message
            : t('payments.loadOneError')}
        </CardContent>
      </Card>
    )
  }

  if (!paymentQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('payments.notFound')}</p>
          <Button asChild variant="outline">
            <Link to="/payments">{t('payments.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const payment = paymentQuery.data
  const formWorkOrders =
    workOrdersQuery.data?.filter((job) => job.id === payment.work_order_id) ?? []

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/payments" className="text-primary hover:underline">
            {t('payments.title')}
          </Link>
          <span className="mx-1.5">/</span>
          {t('payments.editBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('payments.editTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.detailsTitle')}</CardTitle>
          <CardDescription>{t('payments.editHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <PaymentForm
            workOrders={formWorkOrders}
            paidByWorkOrderId={paidByWorkOrderId}
            initialPayment={payment}
            lockWorkOrderId={payment.work_order_id}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('payments.saveChanges')}
            onCancel={() => navigate(`/work-orders/${payment.work_order_id}`)}
            onSubmit={async (input) => {
              setFormError(null)
              try {
                await updatePayment.mutateAsync({
                  amountMinor: input.amountMinor,
                  method: input.method,
                  paidAt: input.paidAt,
                  notes: input.notes,
                })
                navigate(`/work-orders/${payment.work_order_id}`, { replace: true })
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('payments.updateError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
