import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WorkOrderStatusBadge } from '@/features/work-orders/components/work-order-status-badge'
import { useWorkOrders } from '@/features/work-orders/use-work-orders'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import { formatMoney } from '@/lib/money'

export function WorkOrdersListPage() {
  const workOrdersQuery = useWorkOrders()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const currency = organization?.default_currency ?? 'USD'

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('workOrders.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('workOrders.subtitle')}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/work-orders/new">
            <Plus className="h-4 w-4" />
            {t('workOrders.new')}
          </Link>
        </Button>
      </div>

      {workOrdersQuery.isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('workOrders.loading')}
          </CardContent>
        </Card>
      ) : null}

      {workOrdersQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {workOrdersQuery.error instanceof Error
              ? workOrdersQuery.error.message
              : t('workOrders.loadError')}
          </CardContent>
        </Card>
      ) : null}

      {workOrdersQuery.isSuccess && workOrdersQuery.data.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium text-foreground">{t('workOrders.empty')}</p>
            <p className="text-sm text-muted-foreground">{t('workOrders.emptyHint')}</p>
            <Button asChild>
              <Link to="/work-orders/new">{t('workOrders.new')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {workOrdersQuery.isSuccess && workOrdersQuery.data.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {workOrdersQuery.data.map((job) => (
              <Link key={job.id} to={`/work-orders/${job.id}`} className="block">
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.customers?.name ?? t('workOrders.customerFallback')}
                          {job.scheduled_date ? ` · ${job.scheduled_date}` : ''}
                        </p>
                      </div>
                      <WorkOrderStatusBadge status={job.status} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatMoney(job.billable_amount, currency)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colJob')}</th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colCustomer')}</th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colSchedule')}</th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colStatus')}</th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrdersQuery.data.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/work-orders/${job.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {job.title}
                        </Link>
                        {job.quotes?.quote_number ? (
                          <p className="text-xs text-muted-foreground">{job.quotes.quote_number}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.customers?.name ?? t('common.emDash')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.scheduled_date ?? t('common.emDash')}
                      </td>
                      <td className="px-4 py-3">
                        <WorkOrderStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(job.billable_amount, currency)}
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
