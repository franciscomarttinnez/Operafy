import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer, useDeleteCustomer } from '@/features/customers/use-customers'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { useCustomerQuotes } from '@/features/quotes/use-quotes'
import { WorkOrderStatusBadge } from '@/features/work-orders/components/work-order-status-badge'
import { useCustomerWorkOrders } from '@/features/work-orders/use-work-orders'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import { useCustomerPayments } from '@/features/payments/use-payments'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { formatMoney } from '@/lib/money'
import { getErrorMessage } from '@/lib/errors'

function DetailRow({ label, value, empty }: { label: string; value: string | null | undefined; empty: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm text-foreground">
        {value?.trim() ? value : empty}
      </dd>
    </div>
  )
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const customerQuery = useCustomer(customerId)
  const quotesQuery = useCustomerQuotes(customerId)
  const workOrdersQuery = useCustomerWorkOrders(customerId)
  const paymentsQuery = useCustomerPayments(customerId)
  const deleteCustomer = useDeleteCustomer()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'

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
  const hasQuotes = (quotesQuery.data?.length ?? 0) > 0
  const hasJobs = (workOrdersQuery.data?.length ?? 0) > 0
  const hasPayments = (paymentsQuery.data?.length ?? 0) > 0
  const relatedLoading =
    quotesQuery.isLoading || workOrdersQuery.isLoading || paymentsQuery.isLoading
  const deleteBlocked = hasQuotes || hasJobs || hasPayments
  const deleteBlockedMessage = hasQuotes
    ? t('customers.deleteBlockedQuotes')
    : hasJobs
      ? t('customers.deleteBlockedJobs')
      : hasPayments
        ? t('customers.deleteBlockedPayments')
        : null
  const deleteDisabled = deleteCustomer.isPending || relatedLoading || deleteBlocked

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Link to="/customers" className="text-primary hover:underline">
              {t('customers.title')}
            </Link>
            <span className="mx-1.5">/</span>
            {customer.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {customer.name}
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/customers/${customer.id}/edit`}>{t('common.edit')}</Link>
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={deleteDisabled}
            title={deleteBlockedMessage ?? undefined}
            onClick={() => {
              if (deleteBlocked && deleteBlockedMessage) {
                setActionError(deleteBlockedMessage)
                return
              }
              setDeleteOpen(true)
            }}
          >
            {deleteCustomer.isPending ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </div>

      {deleteBlockedMessage ? (
        <p className="text-sm text-muted-foreground">{deleteBlockedMessage}</p>
      ) : null}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('customers.overview')}</CardTitle>
          <CardDescription>{t('customers.overviewHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <DetailRow label={t('customers.phone')} value={customer.phone} empty={t('common.emDash')} />
            <DetailRow label={t('customers.email')} value={customer.email} empty={t('common.emDash')} />
            <DetailRow
              label={t('customers.address')}
              value={customer.address}
              empty={t('common.emDash')}
            />
            <DetailRow label={t('customers.notes')} value={customer.notes} empty={t('common.emDash')} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('customers.quotesTitle')}</CardTitle>
            <CardDescription>{t('customers.quotesHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('quotes.loading')}</p>
            ) : null}
            {quotesQuery.isSuccess && quotesQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('quotes.empty')}</p>
            ) : null}
            {quotesQuery.data?.map((quote) => (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{quote.quote_number}</p>
                  <QuoteStatusBadge status={quote.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{quote.title}</p>
                <p className="mt-1 text-sm font-medium">
                  {formatMoney(quote.total, currency, moneyLocale)}
                </p>
              </Link>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to="/quotes/new">{t('quotes.new')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('customers.jobsTitle')}</CardTitle>
            <CardDescription>{t('customers.jobsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workOrdersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('workOrders.loading')}</p>
            ) : null}
            {workOrdersQuery.isSuccess && workOrdersQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('workOrders.empty')}</p>
            ) : null}
            {workOrdersQuery.data?.map((job) => (
              <Link
                key={job.id}
                to={`/work-orders/${job.id}`}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{job.title}</p>
                  <WorkOrderStatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {job.scheduled_date ?? t('common.emDash')}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatMoney(job.billable_amount, currency, moneyLocale)}
                </p>
              </Link>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to={`/work-orders/new?customerId=${customer.id}`}>{t('workOrders.new')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('customers.paymentsTitle')}</CardTitle>
            <CardDescription>{t('customers.paymentsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('payments.loading')}</p>
            ) : null}
            {paymentsQuery.isSuccess && paymentsQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('payments.empty')}</p>
            ) : null}
            {paymentsQuery.data?.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {formatMoney(payment.amount, currency, moneyLocale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(payment.paid_at).toLocaleDateString(moneyLocale)} ·{' '}
                  {t(paymentMethodLabelKeys[payment.method])}
                </p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to="/payments/new">{t('payments.new')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={t('common.delete')}
        description={t('customers.deleteConfirm', { name: customer.name })}
        confirmLabel={deleteCustomer.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={deleteCustomer.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setActionError(null)
          void deleteCustomer
            .mutateAsync(customer.id)
            .then(() => {
              navigate('/customers', { replace: true })
            })
            .catch((error: unknown) => {
              console.error(error)
              setDeleteOpen(false)
              const message = getErrorMessage(error, t('customers.deleteError'))
              const lower = message.toLowerCase()
              if (lower.includes('existing quotes')) {
                setActionError(t('customers.deleteBlockedQuotes'))
                return
              }
              if (lower.includes('existing work orders')) {
                setActionError(t('customers.deleteBlockedJobs'))
                return
              }
              if (lower.includes('existing payments')) {
                setActionError(t('customers.deleteBlockedPayments'))
                return
              }
              setActionError(message)
            })
        }}
      />
    </div>
  )
}
