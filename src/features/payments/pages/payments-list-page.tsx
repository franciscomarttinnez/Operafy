import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListFilters } from '@/components/list-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PAYMENT_METHODS, type PaymentMethod } from '@/features/payments/payment-method'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import { useDeletePayment, usePayments } from '@/features/payments/use-payments'
import { useOrganization } from '@/features/organizations/use-organization'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { matchesSearchQuery } from '@/lib/search'

function parsePaymentMethod(value: string | null): PaymentMethod | 'all' {
  if (value && (PAYMENT_METHODS as readonly string[]).includes(value)) {
    return value as PaymentMethod
  }
  return 'all'
}

export function PaymentsListPage() {
  const paymentsQuery = usePayments()
  const deletePayment = useDeletePayment()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const search = useDebouncedValue(searchInput, 250)
  const methodFilter = parsePaymentMethod(searchParams.get('method'))
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredPayments = useMemo(() => {
    const rows = paymentsQuery.data ?? []
    return rows.filter((payment) => {
      if (methodFilter !== 'all' && payment.method !== methodFilter) {
        return false
      }
      return matchesSearchQuery(
        search,
        payment.customers?.name,
        payment.work_orders?.title,
      )
    })
  }, [paymentsQuery.data, search, methodFilter])

  const setMethodFilter = (value: PaymentMethod | 'all') => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete('method')
    } else {
      next.set('method', value)
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('payments.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('payments.subtitle')}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/payments/new">
            <Plus className="h-4 w-4" />
            {t('payments.new')}
          </Link>
        </Button>
      </div>

      {paymentsQuery.isSuccess && paymentsQuery.data.length > 0 ? (
        <ListFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('payments.search')}
          searchLabel={t('payments.search')}
          filterValue={methodFilter}
          onFilterChange={setMethodFilter}
          filterOptions={[
            { value: 'all', label: t('common.all') },
            ...PAYMENT_METHODS.map((method) => ({
              value: method,
              label: t(paymentMethodLabelKeys[method]),
            })),
          ]}
        />
      ) : null}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {paymentsQuery.isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('payments.loading')}
          </CardContent>
        </Card>
      ) : null}

      {paymentsQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {paymentsQuery.error instanceof Error
              ? paymentsQuery.error.message
              : t('payments.loadError')}
          </CardContent>
        </Card>
      ) : null}

      {paymentsQuery.isSuccess && paymentsQuery.data.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium text-foreground">{t('payments.empty')}</p>
            <p className="text-sm text-muted-foreground">{t('payments.emptyHint')}</p>
            <Button asChild>
              <Link to="/payments/new">{t('payments.new')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {paymentsQuery.isSuccess &&
      paymentsQuery.data.length > 0 &&
      filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="font-medium text-foreground">{t('payments.noMatches')}</p>
            <p className="text-sm text-muted-foreground">{t('common.noMatchesHint')}</p>
          </CardContent>
        </Card>
      ) : null}

      {paymentsQuery.isSuccess && filteredPayments.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="transition-colors active:bg-accent/50">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {payment.work_orders?.title ?? t('payments.workOrderFallback')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.customers?.name ?? t('common.emDash')} ·{' '}
                        {t(paymentMethodLabelKeys[payment.method])}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatMoney(payment.amount, currency, moneyLocale)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.paid_at).toLocaleDateString(moneyLocale)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to={`/payments/${payment.id}/edit`}>{t('payments.edit')}</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletePayment.isPending}
                      onClick={() => {
                        setActionError(null)
                        setPendingDeleteId(payment.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
                    </Button>
                  </div>
                  {payment.work_orders?.id ? (
                    <Button asChild variant="ghost" size="sm" className="w-full">
                      <Link to={`/work-orders/${payment.work_orders.id}`}>
                        {t('workOrders.backToJob')}
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('payments.colDate')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colCustomer')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colJob')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colMethod')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colAmount')}</th>
                    <th className="px-4 py-3 font-medium">{t('common.edit')}</th>
                    <th className="px-4 py-3 font-medium">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/60"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(payment.paid_at).toLocaleDateString(moneyLocale)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.customers?.id ? (
                          <Link
                            to={`/customers/${payment.customers.id}`}
                            className="text-primary hover:underline"
                          >
                            {payment.customers.name}
                          </Link>
                        ) : (
                          t('common.emDash')
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {payment.work_orders?.id ? (
                          <Link
                            to={`/work-orders/${payment.work_orders.id}`}
                            className="text-primary hover:underline"
                          >
                            {payment.work_orders.title}
                          </Link>
                        ) : (
                          t('common.emDash')
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t(paymentMethodLabelKeys[payment.method])}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(payment.amount, currency, moneyLocale)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/payments/${payment.id}/edit`}
                          className="text-primary hover:underline"
                        >
                          {t('payments.edit')}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletePayment.isPending}
                          onClick={() => {
                            setActionError(null)
                            setPendingDeleteId(payment.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">{t('payments.showingUpTo')}</p>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t('common.delete')}
        description={t('payments.deleteConfirm')}
        confirmLabel={deletePayment.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={deletePayment.isPending}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) {
            return
          }
          const id = pendingDeleteId
          setActionError(null)
          void deletePayment
            .mutateAsync(id)
            .then(() => setPendingDeleteId(null))
            .catch((error: unknown) => {
              console.error(error)
              setPendingDeleteId(null)
              setActionError(getErrorMessage(error, t('payments.deleteError')))
            })
        }}
      />
    </div>
  )
}
