import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import { usePayments } from '@/features/payments/use-payments'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { formatMoney } from '@/lib/money'

export function PaymentsListPage() {
  const paymentsQuery = usePayments()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const currency = organization?.default_currency ?? 'USD'

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

      {paymentsQuery.isSuccess && paymentsQuery.data.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {paymentsQuery.data.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {payment.work_orders?.title ?? t('payments.workOrderFallback')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.customers?.name ?? t('common.emDash')} ·{' '}
                        {t(paymentMethodLabelKeys[payment.method])}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatMoney(payment.amount, currency)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('payments.colDate')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colCustomer')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colJob')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colMethod')}</th>
                    <th className="px-4 py-3 font-medium">{t('payments.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsQuery.data.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/60"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(payment.paid_at).toLocaleDateString()}
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
                        {formatMoney(payment.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
