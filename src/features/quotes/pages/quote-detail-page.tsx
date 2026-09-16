import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { quoteStatusLabelKeys } from '@/features/quotes/quote-status-i18n'
import {
  getAvailableQuoteTransitions,
  isQuoteDeletable,
  isQuoteEditable,
  type QuoteStatus,
} from '@/features/quotes/quote-status'
import { useDeleteQuote, useQuote, useSetQuoteStatus } from '@/features/quotes/use-quotes'
import {
  useCreateWorkOrderFromQuote,
  useQuoteWorkOrder,
} from '@/features/work-orders/use-work-orders'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { formatMoney } from '@/lib/money'
import { getErrorMessage } from '@/lib/errors'

/**
 * "Convert to work order" button. Extracted so it can be rendered in both
 * the desktop action bar and the mobile sticky action bar without repeating
 * the label/loading logic in two places.
 */
function ConvertToWorkOrderButton({
  pending,
  disabled,
  onClick,
  className,
}: {
  pending: boolean
  disabled: boolean
  onClick: () => void
  className: string
}) {
  const { t } = useLocale()
  return (
    <Button className={className} disabled={disabled} onClick={onClick}>
      {pending ? t('workOrders.convertFromQuoteBusy') : t('workOrders.convertFromQuote')}
    </Button>
  )
}

/**
 * Renders one button per forward status transition (e.g. draft -> sent).
 * Extracted so the desktop action bar and the mobile sticky action bar stay
 * in sync without duplicating the transition list rendering.
 */
function QuoteForwardTransitionButtons({
  transitions,
  pending,
  onSelect,
  className,
}: {
  transitions: QuoteStatus[]
  pending: boolean
  onSelect: (status: QuoteStatus) => void
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
          {t('quotes.markStatus', { status: t(quoteStatusLabelKeys[status]) })}
        </Button>
      ))}
    </>
  )
}

export function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>()
  const navigate = useNavigate()
  const quoteQuery = useQuote(quoteId)
  const linkedWorkOrderQuery = useQuoteWorkOrder(quoteId)
  const createFromQuote = useCreateWorkOrderFromQuote()
  const setStatus = useSetQuoteStatus()
  const deleteQuote = useDeleteQuote()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'

  if (!quoteId) {
    return <p className="text-sm text-destructive">{t('quotes.missingId')}</p>
  }

  if (quoteQuery.isLoading) {
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

  const quote = quoteQuery.data
  const transitions = getAvailableQuoteTransitions(quote.status)
  const forwardTransitions = transitions.filter((status) => status !== 'rejected')
  const canReject = transitions.includes('rejected')
  const busy =
    setStatus.isPending || deleteQuote.isPending || createFromQuote.isPending

  const applyStatus = (status: QuoteStatus) => {
    setActionError(null)
    void setStatus
      .mutateAsync({ quoteId: quote.id, status })
      .catch((error: unknown) => {
        console.error(error)
        setActionError(getErrorMessage(error, t('quotes.statusError')))
      })
  }

  const handleConvertToWorkOrder = () => {
    setActionError(null)
    void createFromQuote
      .mutateAsync({ quoteId: quote.id })
      .then((job) => {
        navigate(`/work-orders/${job.id}`)
      })
      .catch((error: unknown) => {
        console.error(error)
        setActionError(getErrorMessage(error, t('workOrders.convertError')))
      })
  }

  return (
    <div className="animate-fade-in-up space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Link to="/quotes" className="text-primary hover:underline">
              {t('quotes.title')}
            </Link>
            <span className="mx-1.5">/</span>
            {quote.quote_number}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {quote.title}
            </h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {quote.customers?.name ?? t('quotes.customerFallback')} ·{' '}
            {formatMoney(quote.total, currency, moneyLocale)}
          </p>
        </div>

        <div className="hidden w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-end md:flex lg:w-auto">
          {quote.status === 'accepted' && !linkedWorkOrderQuery.data ? (
            <ConvertToWorkOrderButton
              className="w-full sm:w-auto"
              pending={createFromQuote.isPending}
              disabled={createFromQuote.isPending || linkedWorkOrderQuery.isLoading}
              onClick={handleConvertToWorkOrder}
            />
          ) : null}
          <QuoteForwardTransitionButtons
            className="w-full sm:w-auto"
            transitions={forwardTransitions}
            pending={setStatus.isPending}
            onSelect={applyStatus}
          />
          {quote.status === 'accepted' && linkedWorkOrderQuery.data ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/work-orders/${linkedWorkOrderQuery.data.id}`}>
                {t('workOrders.viewExisting')}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/quotes/${quote.id}/print`} target="_blank" rel="noreferrer">
              {t('quotes.printPdf')}
            </Link>
          </Button>
          {isQuoteEditable(quote.status) ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/quotes/${quote.id}/edit`}>{t('common.edit')}</Link>
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={setStatus.isPending}
              onClick={() => setRejectOpen(true)}
            >
              {t('quotes.markStatus', { status: t(quoteStatusLabelKeys.rejected) })}
            </Button>
          ) : null}
          {isQuoteDeletable(quote.status) ? (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deleteQuote.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              {deleteQuote.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 md:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link to={`/quotes/${quote.id}/print`} target="_blank" rel="noreferrer">
              {t('quotes.printPdf')}
            </Link>
          </Button>
          {quote.status === 'accepted' && linkedWorkOrderQuery.data ? (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/work-orders/${linkedWorkOrderQuery.data.id}`}>
                {t('workOrders.viewExisting')}
              </Link>
            </Button>
          ) : null}
          {isQuoteEditable(quote.status) ? (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/quotes/${quote.id}/edit`}>{t('common.edit')}</Link>
            </Button>
          ) : null}
          {canReject ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={setStatus.isPending}
              onClick={() => setRejectOpen(true)}
            >
              {t('quotes.markStatus', { status: t(quoteStatusLabelKeys.rejected) })}
            </Button>
          ) : null}
          {isQuoteDeletable(quote.status) ? (
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleteQuote.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              {deleteQuote.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('quotes.lineItems')}</CardTitle>
            <CardDescription>{t('quotes.lineItemsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quote.quote_line_items.map((line) => (
              <div
                key={line.id}
                className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{line.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {line.quantity} × {formatMoney(line.unit_price, currency, moneyLocale)}
                  </p>
                </div>
                <p className="font-medium text-foreground">
                  {formatMoney(line.line_total, currency, moneyLocale)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('quotes.customer')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {quote.customers?.name ?? t('common.emDash')}
              </p>
              <p className="text-muted-foreground">
                {quote.customers?.phone ?? t('quotes.noPhone')}
              </p>
              <p className="text-muted-foreground">
                {quote.customers?.email ?? t('quotes.noEmail')}
              </p>
              {quote.customers?.id ? (
                <Link
                  to={`/customers/${quote.customers.id}`}
                  className="inline-block pt-2 text-primary hover:underline"
                >
                  {t('quotes.viewCustomer')}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('quotes.totals')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t('quotes.subtotal')}</span>
                <span>{formatMoney(quote.subtotal, currency, moneyLocale)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t('quotes.discount')}</span>
                <span>-{formatMoney(quote.discount_amount, currency, moneyLocale)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t('quotes.tax')}</span>
                <span>{formatMoney(quote.tax_amount, currency, moneyLocale)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
                <span>{t('quotes.total')}</span>
                <span>{formatMoney(quote.total, currency, moneyLocale)}</span>
              </div>
            </CardContent>
          </Card>

          {quote.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('quotes.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={rejectOpen}
        title={t('quotes.markStatus', { status: t(quoteStatusLabelKeys.rejected) })}
        description={t('quotes.rejectConfirm', { number: quote.quote_number })}
        confirmLabel={t('quotes.markStatus', { status: t(quoteStatusLabelKeys.rejected) })}
        destructive
        busy={busy}
        onCancel={() => setRejectOpen(false)}
        onConfirm={() => {
          setRejectOpen(false)
          applyStatus('rejected')
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t('common.delete')}
        description={t('quotes.deleteConfirm', { number: quote.quote_number })}
        confirmLabel={deleteQuote.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setActionError(null)
          void deleteQuote
            .mutateAsync(quote.id)
            .then(() => navigate('/quotes', { replace: true }))
            .catch((error: unknown) => {
              console.error(error)
              setDeleteOpen(false)
              setActionError(getErrorMessage(error, t('quotes.deleteError')))
            })
        }}
      />

      {forwardTransitions.length > 0 ||
      (quote.status === 'accepted' && !linkedWorkOrderQuery.data) ? (
        <div className="sticky-mobile-actions">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
            {quote.status === 'accepted' && !linkedWorkOrderQuery.data ? (
              <ConvertToWorkOrderButton
                className="w-full"
                pending={createFromQuote.isPending}
                disabled={createFromQuote.isPending || linkedWorkOrderQuery.isLoading}
                onClick={handleConvertToWorkOrder}
              />
            ) : null}
            <QuoteForwardTransitionButtons
              className="w-full"
              transitions={forwardTransitions}
              pending={setStatus.isPending}
              onSelect={applyStatus}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
