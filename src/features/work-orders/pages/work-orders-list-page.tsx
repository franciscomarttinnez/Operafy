import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ListFilters } from '@/components/list-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WorkOrderStatusBadge } from '@/features/work-orders/components/work-order-status-badge'
import { workOrderStatusLabelKeys } from '@/features/work-orders/work-order-status-i18n'
import {
  WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from '@/features/work-orders/work-order-status'
import { useWorkOrders } from '@/features/work-orders/use-work-orders'
import { usePaidByWorkOrderId } from '@/features/payments/use-payments'
import { useOrganization } from '@/features/organizations/use-organization'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocale } from '@/i18n/use-locale'
import { calculatePaymentBalance, formatMoney } from '@/lib/money'
import { matchesSearchQuery } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { WorkOrderWithCustomer } from '@/types/database'

type WorkOrderListFilter = WorkOrderStatus | 'all' | 'active'
type BalanceFilter = 'all' | 'unpaid'
type SortColumn = 'job' | 'schedule' | 'status' | 'balance'
type ScheduleSortMode = 'nearest' | 'furthestFuture' | 'mostOverdue'
type SortState =
  | { column: 'job'; direction: 'asc' | 'desc' }
  | { column: 'balance'; direction: 'asc' | 'desc' }
  | { column: 'status'; pin: WorkOrderStatus }
  | { column: 'schedule'; mode: ScheduleSortMode }

function parseWorkOrderFilter(value: string | null): WorkOrderListFilter {
  if (value === 'active') {
    return 'active'
  }
  if (value && (WORK_ORDER_STATUSES as readonly string[]).includes(value)) {
    return value as WorkOrderStatus
  }
  return 'all'
}

function matchesWorkOrderFilter(status: WorkOrderStatus, filter: WorkOrderListFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'active') {
    return status === 'pending' || status === 'scheduled' || status === 'in_progress'
  }
  return status === filter
}

function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function quoteNumberValue(quoteNumber: string | null | undefined): number {
  if (!quoteNumber) {
    return Number.POSITIVE_INFINITY
  }
  const match = quoteNumber.match(/(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

function daysFromToday(scheduledDate: string | null, today: string): number | null {
  if (!scheduledDate) {
    return null
  }
  const scheduled = Date.parse(`${scheduledDate}T12:00:00`)
  const current = Date.parse(`${today}T12:00:00`)
  if (Number.isNaN(scheduled) || Number.isNaN(current)) {
    return null
  }
  return Math.round((scheduled - current) / 86_400_000)
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: 'asc' | 'desc',
): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return direction === 'asc' ? a - b : b - a
}

function nextSortState(current: SortState | null, column: SortColumn): SortState {
  if (column === 'job') {
    if (current?.column === 'job' && current.direction === 'asc') {
      return { column: 'job', direction: 'desc' }
    }
    return { column: 'job', direction: 'asc' }
  }

  if (column === 'balance') {
    if (current?.column === 'balance' && current.direction === 'desc') {
      return { column: 'balance', direction: 'asc' }
    }
    return { column: 'balance', direction: 'desc' }
  }

  if (column === 'status') {
    if (current?.column !== 'status') {
      return { column: 'status', pin: 'completed' }
    }
    const index = WORK_ORDER_STATUSES.indexOf(current.pin)
    const next = WORK_ORDER_STATUSES[(index + 1) % WORK_ORDER_STATUSES.length]
    return { column: 'status', pin: next }
  }

  if (current?.column !== 'schedule') {
    return { column: 'schedule', mode: 'nearest' }
  }
  const modes: ScheduleSortMode[] = ['nearest', 'furthestFuture', 'mostOverdue']
  const index = modes.indexOf(current.mode)
  return { column: 'schedule', mode: modes[(index + 1) % modes.length] }
}

function sortJobs(
  jobs: WorkOrderWithCustomer[],
  sort: SortState | null,
  paidByWorkOrderId: Record<string, number>,
  today: string,
): WorkOrderWithCustomer[] {
  if (!sort) {
    return jobs
  }

  const rows = [...jobs]
  rows.sort((a, b) => {
    if (sort.column === 'job') {
      const aValue = quoteNumberValue(a.quotes?.quote_number)
      const bValue = quoteNumberValue(b.quotes?.quote_number)
      if (aValue !== bValue) {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }
      const byTitle = a.title.localeCompare(b.title)
      return sort.direction === 'asc' ? byTitle : -byTitle
    }

    if (sort.column === 'balance') {
      const aBalance = Math.max(
        calculatePaymentBalance(a.billable_amount, paidByWorkOrderId[a.id] ?? 0).balanceMinor,
        0,
      )
      const bBalance = Math.max(
        calculatePaymentBalance(b.billable_amount, paidByWorkOrderId[b.id] ?? 0).balanceMinor,
        0,
      )
      return sort.direction === 'asc' ? aBalance - bBalance : bBalance - aBalance
    }

    if (sort.column === 'status') {
      const aRank = a.status === sort.pin ? 0 : WORK_ORDER_STATUSES.indexOf(a.status) + 1
      const bRank = b.status === sort.pin ? 0 : WORK_ORDER_STATUSES.indexOf(b.status) + 1
      if (aRank !== bRank) {
        return aRank - bRank
      }
      return a.title.localeCompare(b.title)
    }

    const aDays = daysFromToday(a.scheduled_date, today)
    const bDays = daysFromToday(b.scheduled_date, today)

    if (sort.mode === 'nearest') {
      const aAbs = aDays === null ? null : Math.abs(aDays)
      const bAbs = bDays === null ? null : Math.abs(bDays)
      const byAbs = compareNullableNumber(aAbs, bAbs, 'asc')
      if (byAbs !== 0) {
        return byAbs
      }
      return compareNullableNumber(aDays, bDays, 'asc')
    }

    if (sort.mode === 'furthestFuture') {
      return compareNullableNumber(aDays, bDays, 'desc')
    }

    // mostOverdue: most negative first; undated/future last
    const aOverdue = aDays !== null && aDays < 0 ? aDays : null
    const bOverdue = bDays !== null && bDays < 0 ? bDays : null
    const byOverdue = compareNullableNumber(aOverdue, bOverdue, 'asc')
    if (byOverdue !== 0) {
      return byOverdue
    }
    return compareNullableNumber(aDays, bDays, 'asc')
  })

  return rows
}

function SortHeaderButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  icon: 'asc' | 'desc' | 'neutral' | 'cycle'
  onClick: () => void
}) {
  const Icon =
    icon === 'asc' ? ArrowUp : icon === 'desc' ? ArrowDown : icon === 'cycle' ? ArrowUpDown : ArrowUpDown

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      <Icon className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-50')} />
    </button>
  )
}

export function WorkOrdersListPage() {
  const workOrdersQuery = useWorkOrders()
  const {
    paidByWorkOrderId,
    isLoading: paymentsLoading,
    isSuccess: paymentsReady,
  } = usePaidByWorkOrderId()
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [sort, setSort] = useState<SortState | null>(null)
  const search = useDebouncedValue(searchInput, 250)
  const statusFilter = parseWorkOrderFilter(searchParams.get('status'))
  const balanceFilter: BalanceFilter =
    searchParams.get('balance') === 'unpaid' ? 'unpaid' : 'all'
  const scheduleFilter = searchParams.get('scheduled') === 'today' ? 'today' : 'all'
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const today = todayIsoDate()

  const filteredJobs = useMemo(() => {
    const rows = workOrdersQuery.data ?? []
    const filtered = rows.filter((job) => {
      if (!matchesWorkOrderFilter(job.status, statusFilter)) {
        return false
      }
      if (scheduleFilter === 'today' && job.scheduled_date !== today) {
        return false
      }
      if (balanceFilter === 'unpaid') {
        if (job.status === 'cancelled') {
          return false
        }
        const balance = calculatePaymentBalance(
          job.billable_amount,
          paidByWorkOrderId[job.id] ?? 0,
        ).balanceMinor
        if (balance <= 0) {
          return false
        }
      }
      return matchesSearchQuery(
        search,
        job.title,
        job.customers?.name,
        job.quotes?.quote_number,
      )
    })

    return sortJobs(filtered, sort, paidByWorkOrderId, today)
  }, [
    workOrdersQuery.data,
    search,
    statusFilter,
    scheduleFilter,
    balanceFilter,
    today,
    paidByWorkOrderId,
    sort,
  ])

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next, { replace: true })
  }

  const setStatusFilter = (value: WorkOrderListFilter) => {
    patchParams({ status: value })
  }

  const toggleUnpaid = () => {
    patchParams({ balance: balanceFilter === 'unpaid' ? 'all' : 'unpaid' })
  }

  const headerIcon = (column: SortColumn): 'asc' | 'desc' | 'neutral' | 'cycle' => {
    if (!sort || sort.column !== column) {
      return 'neutral'
    }
    if (sort.column === 'job' || sort.column === 'balance') {
      return sort.direction
    }
    return 'cycle'
  }

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

      {workOrdersQuery.isSuccess && workOrdersQuery.data.length > 0 ? (
        <ListFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('workOrders.search')}
          searchLabel={t('workOrders.search')}
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'all', label: t('common.all') },
            { value: 'active', label: t('workOrders.filterActive') },
            ...WORK_ORDER_STATUSES.map((status) => ({
              value: status,
              label: t(workOrderStatusLabelKeys[status]),
            })),
          ]}
        >
          <button
            type="button"
            onClick={toggleUnpaid}
            className={cn(
              'shrink-0 touch-manipulation rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
              balanceFilter === 'unpaid'
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-dashed border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-accent-foreground',
            )}
            aria-pressed={balanceFilter === 'unpaid'}
          >
            {t('workOrders.filterUnpaid')}
          </button>
        </ListFilters>
      ) : null}

      {workOrdersQuery.isLoading ||
      (balanceFilter === 'unpaid' && paymentsLoading) ? (
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

      {workOrdersQuery.isSuccess &&
      workOrdersQuery.data.length > 0 &&
      (balanceFilter !== 'unpaid' || paymentsReady) &&
      filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="font-medium text-foreground">{t('workOrders.noMatches')}</p>
            <p className="text-sm text-muted-foreground">{t('common.noMatchesHint')}</p>
          </CardContent>
        </Card>
      ) : null}

      {workOrdersQuery.isSuccess &&
      (balanceFilter !== 'unpaid' || paymentsReady) &&
      filteredJobs.length > 0 ? (
        <>
          {sort ? (
            <p className="text-xs text-muted-foreground">
              {sort.column === 'job'
                ? sort.direction === 'asc'
                  ? t('workOrders.sortJobAsc')
                  : t('workOrders.sortJobDesc')
                : null}
              {sort.column === 'balance'
                ? sort.direction === 'desc'
                  ? t('workOrders.sortBalanceDesc')
                  : t('workOrders.sortBalanceAsc')
                : null}
              {sort.column === 'status'
                ? t('workOrders.sortStatusPin', {
                    status: t(workOrderStatusLabelKeys[sort.pin]),
                  })
                : null}
              {sort.column === 'schedule'
                ? sort.mode === 'nearest'
                  ? t('workOrders.sortNearest')
                  : sort.mode === 'furthestFuture'
                    ? t('workOrders.sortFurthest')
                    : t('workOrders.sortOverdue')
                : null}
            </p>
          ) : null}

          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
            {(
              [
                { column: 'schedule' as const, label: t('workOrders.colSchedule') },
                { column: 'balance' as const, label: t('workOrders.colBalance') },
                { column: 'status' as const, label: t('workOrders.colStatus') },
                { column: 'job' as const, label: t('workOrders.colJob') },
              ] as const
            ).map((option) => {
              const active = sort?.column === option.column
              return (
                <button
                  key={option.column}
                  type="button"
                  onClick={() => setSort((current) => nextSortState(current, option.column))}
                  className={cn(
                    'shrink-0 touch-manipulation rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {t('workOrders.sortBy', { column: option.label })}
                </button>
              )
            })}
          </div>

          <div className="space-y-3 md:hidden">
            {filteredJobs.map((job) => {
              const balance = calculatePaymentBalance(
                job.billable_amount,
                paidByWorkOrderId[job.id] ?? 0,
              ).balanceMinor
              return (
                <Link
                  key={job.id}
                  to={`/work-orders/${job.id}`}
                  className="touch-card block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-colors active:bg-accent/50 md:transition-all md:hover:-translate-y-0.5 md:hover:shadow-md">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{job.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.customers?.name ?? t('workOrders.customerFallback')}
                            {job.scheduled_date ? ` · ${job.scheduled_date}` : ''}
                            {job.quotes?.quote_number ? ` · ${job.quotes.quote_number}` : ''}
                          </p>
                        </div>
                        <WorkOrderStatusBadge status={job.status} />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="font-semibold text-foreground">
                          {formatMoney(job.billable_amount, currency, moneyLocale)}
                        </p>
                        <p className="text-muted-foreground">
                          {t('workOrders.colBalance')}:{' '}
                          {formatMoney(Math.max(balance, 0), currency, moneyLocale)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <SortHeaderButton
                        label={t('workOrders.colJob')}
                        active={sort?.column === 'job'}
                        icon={headerIcon('job')}
                        onClick={() => setSort((current) => nextSortState(current, 'job'))}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colCustomer')}</th>
                    <th className="px-4 py-3">
                      <SortHeaderButton
                        label={t('workOrders.colSchedule')}
                        active={sort?.column === 'schedule'}
                        icon={headerIcon('schedule')}
                        onClick={() => setSort((current) => nextSortState(current, 'schedule'))}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <SortHeaderButton
                        label={t('workOrders.colStatus')}
                        active={sort?.column === 'status'}
                        icon={headerIcon('status')}
                        onClick={() => setSort((current) => nextSortState(current, 'status'))}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">{t('workOrders.colAmount')}</th>
                    <th className="px-4 py-3">
                      <SortHeaderButton
                        label={t('workOrders.colBalance')}
                        active={sort?.column === 'balance'}
                        icon={headerIcon('balance')}
                        onClick={() => setSort((current) => nextSortState(current, 'balance'))}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => {
                    const balance = calculatePaymentBalance(
                      job.billable_amount,
                      paidByWorkOrderId[job.id] ?? 0,
                    ).balanceMinor
                    return (
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
                            <p className="text-xs text-muted-foreground">
                              {job.quotes.quote_number}
                            </p>
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
                          {formatMoney(job.billable_amount, currency, moneyLocale)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatMoney(Math.max(balance, 0), currency, moneyLocale)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">{t('workOrders.showingUpTo')}</p>
        </>
      ) : null}
    </div>
  )
}
