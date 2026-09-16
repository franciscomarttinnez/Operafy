import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkOrderStatusBadge } from '@/features/work-orders/components/work-order-status-badge'
import { workOrderStatusLabelKeys } from '@/features/work-orders/work-order-status-i18n'
import {
  getAvailableWorkOrderTransitions,
  isWorkOrderDeletable,
  isWorkOrderEditable,
  type WorkOrderStatus,
} from '@/features/work-orders/work-order-status'
import {
  useDeleteWorkOrder,
  useSetWorkOrderStatus,
  useWorkOrder,
} from '@/features/work-orders/use-work-orders'
import {
  useDeletePayment,
  useWorkOrderPayments,
} from '@/features/payments/use-payments'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { calculatePaymentBalance, formatMoney, sumPaymentAmountsMinor } from '@/lib/money'
import { getErrorMessage } from '@/lib/errors'

/**
 * Renders one button per forward status transition (e.g. pending -> scheduled).
 * Extracted so the desktop action bar and the mobile sticky action bar stay
 * in sync without duplicating the transition list rendering.
 */
function WorkOrderForwardTransitionButtons({
  transitions,
  pending,
  onSelect,
  className,
}: {
  transitions: WorkOrderStatus[]
  pending: boolean
  onSelect: (status: WorkOrderStatus) => void
  className: string
}) {
  const { t } = useLocale()
  return (
    <>
      {transitions.map((status) => (
        <Button
          key={status}
          className={className}
          disabled={pending}
          onClick={() => onSelect(status)}
        >
          {t('workOrders.markStatus', { status: t(workOrderStatusLabelKeys[status]) })}
        </Button>
      ))}
    </>
  )
}

/**
 * "Register payment" link button, reused across the desktop action bar, the
 * empty payments state, and the mobile sticky action bar.
 */
function RegisterPaymentButton({
  workOrderId,
  variant,
  className,
}: {
  workOrderId: string
  variant?: ButtonProps['variant']
  className: string
}) {
  const { t } = useLocale()
  return (
    <Button asChild variant={variant} className={className}>
      <Link to={`/payments/new?workOrderId=${workOrderId}`}>{t('payments.new')}</Link>
    </Button>
  )
}

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>()
  const navigate = useNavigate()
  const workOrderQuery = useWorkOrder(workOrderId)
  const paymentsQuery = useWorkOrderPayments(workOrderId)
  const setStatus = useSetWorkOrderStatus()
  const deleteWorkOrder = useDeleteWorkOrder()
  const deletePayment = useDeletePayment()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'

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

  const job = workOrderQuery.data
  const transitions = getAvailableWorkOrderTransitions(job.status)
  const forwardTransitions = transitions.filter((status) => status !== 'cancelled')
  const canCancel = transitions.includes('cancelled')
  const paidMinor = sumPaymentAmountsMinor((paymentsQuery.data ?? []).map((payment) => payment.amount))
  const balance = calculatePaymentBalance(job.billable_amount, paidMinor)
  const canCollect = job.status !== 'cancelled' && balance.balanceMinor > 0
  const busy =
    setStatus.isPending || deleteWorkOrder.isPending || deletePayment.isPending

  const applyStatus = (status: WorkOrderStatus) => {
    setActionError(null)
    void setStatus
      .mutateAsync({ workOrderId: job.id, status })
      .catch((error: unknown) => {
        console.error(error)
        setActionError(getErrorMessage(error, t('workOrders.statusError')))
      })
  }

  return (
    <div className="animate-fade-in-up space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Link to="/work-orders" className="text-primary hover:underline">
              {t('workOrders.title')}
            </Link>
            <span className="mx-1.5">/</span>
            {job.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {job.title}
            </h1>
            <WorkOrderStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.customers?.name ?? t('workOrders.customerFallback')} ·{' '}
            {formatMoney(job.billable_amount, currency, moneyLocale)}
          </p>
        </div>

        <div className="hidden w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-end md:flex lg:w-auto">
          {canCollect ? (
            <RegisterPaymentButton
              workOrderId={job.id}
              className="w-full sm:w-auto"
            />
          ) : null}
          <WorkOrderForwardTransitionButtons
            className="w-full sm:w-auto"
            transitions={forwardTransitions}
            pending={setStatus.isPending}
            onSelect={applyStatus}
          />
          {isWorkOrderEditable(job.status) ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/work-orders/${job.id}/edit`}>{t('common.edit')}</Link>
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={setStatus.isPending}
              onClick={() => setCancelOpen(true)}
            >
              {t('workOrders.markStatus', { status: t(workOrderStatusLabelKeys.cancelled) })}
            </Button>
          ) : null}
          {isWorkOrderDeletable(job.status) ? (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deleteWorkOrder.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              {deleteWorkOrder.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 md:hidden">
          {isWorkOrderEditable(job.status) ? (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/work-orders/${job.id}/edit`}>{t('common.edit')}</Link>
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={setStatus.isPending}
              onClick={() => setCancelOpen(true)}
            >
              {t('workOrders.markStatus', { status: t(workOrderStatusLabelKeys.cancelled) })}
            </Button>
          ) : null}
          {isWorkOrderDeletable(job.status) ? (
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleteWorkOrder.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              {deleteWorkOrder.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('workOrders.overview')}</CardTitle>
            <CardDescription>{t('workOrders.overviewHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('workOrders.scheduledDate')}</span>
              <span>{job.scheduled_date ?? t('common.emDash')}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('workOrders.billableAmount')}</span>
              <span className="font-medium">
                {formatMoney(job.billable_amount, currency, moneyLocale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('payments.paid')}</span>
              <span>{formatMoney(balance.paidMinor, currency, moneyLocale)}</span>
            </div>
            <div className="flex justify-between gap-3 font-medium">
              <span>{t('payments.balance')}</span>
              <span>{formatMoney(balance.balanceMinor, currency, moneyLocale)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t('workOrders.completedAt')}</span>
              <span>
                {job.completed_at
                  ? new Date(job.completed_at).toLocaleString(moneyLocale)
                  : t('common.emDash')}
              </span>
            </div>
            {job.description ? (
              <div>
                <p className="font-medium text-foreground">{t('workOrders.description')}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{job.description}</p>
              </div>
            ) : null}
            {job.notes ? (
              <div>
                <p className="font-medium text-foreground">{t('workOrders.notes')}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{job.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('workOrders.customer')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {job.customers?.name ?? t('common.emDash')}
              </p>
              <p className="text-muted-foreground">
                {job.customers?.phone ?? t('quotes.noPhone')}
              </p>
              <p className="text-muted-foreground">
                {job.customers?.email ?? t('quotes.noEmail')}
              </p>
              {job.customers?.id ? (
                <Link
                  to={`/customers/${job.customers.id}`}
                  className="inline-block pt-2 text-primary hover:underline"
                >
                  {t('quotes.viewCustomer')}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('workOrders.linkedQuote')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {job.quotes ? (
                <div className="space-y-1">
                  <Link
                    to={`/quotes/${job.quotes.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {job.quotes.quote_number}
                  </Link>
                  <p className="text-muted-foreground">{job.quotes.title}</p>
                  <p className="font-medium">
                    {formatMoney(job.quotes.total, currency, moneyLocale)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('workOrders.noLinkedQuote')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.history')}</CardTitle>
          <CardDescription>{t('payments.historyHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('payments.loading')}</p>
          ) : null}
          {paymentsQuery.isSuccess && paymentsQuery.data.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('payments.empty')}</p>
              {canCollect ? (
                <RegisterPaymentButton
                  workOrderId={job.id}
                  variant="outline"
                  className="w-full sm:w-auto"
                />
              ) : null}
            </div>
          ) : null}
          {paymentsQuery.data?.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {formatMoney(payment.amount, currency, moneyLocale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(payment.paid_at).toLocaleDateString(moneyLocale)} ·{' '}
                  {t(paymentMethodLabelKeys[payment.method])}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link to={`/payments/${payment.id}/edit`}>{t('payments.edit')}</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={deletePayment.isPending}
                  onClick={() => setPaymentToDelete(payment.id)}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        title={t('workOrders.markStatus', { status: t(workOrderStatusLabelKeys.cancelled) })}
        description={t('workOrders.cancelConfirm', { title: job.title })}
        confirmLabel={t('workOrders.markStatus', {
          status: t(workOrderStatusLabelKeys.cancelled),
        })}
        destructive
        busy={busy}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => {
          setCancelOpen(false)
          applyStatus('cancelled')
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t('common.delete')}
        description={t('workOrders.deleteConfirm', { title: job.title })}
        confirmLabel={deleteWorkOrder.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setActionError(null)
          void deleteWorkOrder
            .mutateAsync(job.id)
            .then(() => navigate('/work-orders', { replace: true }))
            .catch((error: unknown) => {
              console.error(error)
              setDeleteOpen(false)
              setActionError(getErrorMessage(error, t('workOrders.deleteError')))
            })
        }}
      />

      <ConfirmDialog
        open={paymentToDelete !== null}
        title={t('common.delete')}
        description={t('payments.deleteConfirm')}
        confirmLabel={deletePayment.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={busy}
        onCancel={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (!paymentToDelete) {
            return
          }
          const id = paymentToDelete
          setActionError(null)
          void deletePayment
            .mutateAsync(id)
            .then(() => setPaymentToDelete(null))
            .catch((error: unknown) => {
              console.error(error)
              setPaymentToDelete(null)
              setActionError(getErrorMessage(error, t('payments.deleteError')))
            })
        }}
      />

      {canCollect || forwardTransitions.length > 0 ? (
        <div className="sticky-mobile-actions">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
            <WorkOrderForwardTransitionButtons
              className="w-full"
              transitions={forwardTransitions}
              pending={setStatus.isPending}
              onSelect={applyStatus}
            />
            {canCollect ? (
              <RegisterPaymentButton
                workOrderId={job.id}
                variant={forwardTransitions.length > 0 ? 'outline' : 'default'}
                className="w-full"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
