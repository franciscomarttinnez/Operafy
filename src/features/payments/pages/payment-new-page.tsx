import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentForm } from '@/features/payments/components/payment-form'
import { useCreatePayment, usePayments } from '@/features/payments/use-payments'
import { useWorkOrders } from '@/features/work-orders/use-work-orders'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { calculatePaymentBalance, sumPaymentAmountsMinor } from '@/lib/money'
import { getErrorMessage } from '@/lib/errors'

export function PaymentNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetWorkOrderId = searchParams.get('workOrderId') ?? undefined
  const createPayment = useCreatePayment()
  const workOrdersQuery = useWorkOrders()
  const paymentsQuery = usePayments()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  const paidByWorkOrderId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const payment of paymentsQuery.data ?? []) {
      map[payment.work_order_id] = (map[payment.work_order_id] ?? 0) + payment.amount
    }
    return map
  }, [paymentsQuery.data])

  const eligibleWorkOrders = useMemo(() => {
    return (workOrdersQuery.data ?? []).filter((job) => {
      if (job.status === 'cancelled') {
        return false
      }
      const paid = paidByWorkOrderId[job.id] ?? 0
      return calculatePaymentBalance(job.billable_amount, paid).balanceMinor > 0
    })
  }, [workOrdersQuery.data, paidByWorkOrderId])

  const lockedWorkOrder =
    workOrdersQuery.data?.find((job) => job.id === presetWorkOrderId) ?? null

  if (workOrdersQuery.isLoading || paymentsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('payments.loading')}
        </CardContent>
      </Card>
    )
  }

  if (
    !lockedWorkOrder &&
    workOrdersQuery.isSuccess &&
    eligibleWorkOrders.length === 0
  ) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t('payments.needJobTitle')}</CardTitle>
          <CardDescription>{t('payments.needJobBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/work-orders/new">{t('workOrders.new')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (
    lockedWorkOrder &&
    lockedWorkOrder.status === 'cancelled'
  ) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t('payments.cancelledJobTitle')}</CardTitle>
          <CardDescription>{t('payments.cancelledJobBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={`/work-orders/${lockedWorkOrder.id}`}>{t('workOrders.backToJob')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (
    lockedWorkOrder &&
    calculatePaymentBalance(
      lockedWorkOrder.billable_amount,
      sumPaymentAmountsMinor(
        (paymentsQuery.data ?? [])
          .filter((payment) => payment.work_order_id === lockedWorkOrder.id)
          .map((payment) => payment.amount),
      ),
    ).balanceMinor <= 0
  ) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t('payments.fullyPaidTitle')}</CardTitle>
          <CardDescription>{t('payments.fullyPaidBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={`/work-orders/${lockedWorkOrder.id}`}>{t('workOrders.backToJob')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const formWorkOrders = lockedWorkOrder
    ? [lockedWorkOrder]
    : eligibleWorkOrders

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/payments" className="text-primary hover:underline">
            {t('payments.title')}
          </Link>
          <span className="mx-1.5">/</span>
          {t('payments.newBreadcrumb')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {t('payments.newTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.detailsTitle')}</CardTitle>
          <CardDescription>{t('payments.detailsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? <p className="mb-4 text-sm text-destructive">{formError}</p> : null}
          <PaymentForm
            workOrders={formWorkOrders}
            paidByWorkOrderId={paidByWorkOrderId}
            lockWorkOrderId={presetWorkOrderId}
            currencyCode={organization?.default_currency ?? 'USD'}
            submitLabel={t('payments.create')}
            onCancel={() =>
              navigate(
                presetWorkOrderId ? `/work-orders/${presetWorkOrderId}` : '/payments',
              )
            }
            onSubmit={async (input) => {
              setFormError(null)
              try {
                await createPayment.mutateAsync(input)
                navigate(
                  presetWorkOrderId
                    ? `/work-orders/${presetWorkOrderId}`
                    : '/payments',
                  { replace: true },
                )
              } catch (error) {
                console.error(error)
                setFormError(getErrorMessage(error, t('payments.createError')))
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
