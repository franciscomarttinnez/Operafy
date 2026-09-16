import { Link } from 'react-router-dom'
import { useState } from 'react'
import { X } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { WorkOrderStatusBadge } from '@/features/work-orders/components/work-order-status-badge'
import { useOrganization } from '@/features/organizations/use-organization'
import { usePaidByWorkOrderId } from '@/features/payments/use-payments'
import { useAllQuotes } from '@/features/quotes/use-quotes'
import { useAllWorkOrders } from '@/features/work-orders/use-work-orders'
import { useLocale } from '@/i18n/use-locale'
import type { MessageKey } from '@/i18n/types'
import { calculatePaymentBalance, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

const GUIDE_STORAGE_KEY = 'operafy.guide.hidden'

const toneClass = {
  primary: 'bg-accent text-primary',
  warning: 'bg-amber-50 text-warning dark:bg-amber-950/40',
  success: 'bg-emerald-50 text-success dark:bg-emerald-950/40',
} as const

const guideSteps: Array<{ titleKey: MessageKey; bodyKey: MessageKey; to?: string }> = [
  { titleKey: 'guide.step1Title', bodyKey: 'guide.step1Body', to: '/customers' },
  { titleKey: 'guide.step2Title', bodyKey: 'guide.step2Body', to: '/quotes' },
  { titleKey: 'guide.step3Title', bodyKey: 'guide.step3Body', to: '/work-orders' },
  { titleKey: 'guide.step4Title', bodyKey: 'guide.step4Body', to: '/payments' },
]

function readGuideHidden(): boolean {
  return window.localStorage.getItem(GUIDE_STORAGE_KEY) === '1'
}

function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DashboardPage() {
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const quotesQuery = useAllQuotes()
  const workOrdersQuery = useAllWorkOrders()
  const { paidByWorkOrderId, isSuccess: paymentsReady } = usePaidByWorkOrderId()
  const currency = organization?.default_currency ?? 'USD'
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const [guideVisible, setGuideVisible] = useState(() => !readGuideHidden())
  const [dismissOpen, setDismissOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const today = todayIsoDate()

  const pendingQuotes =
    quotesQuery.data?.filter((quote) => quote.status === 'draft' || quote.status === 'sent')
      .length ?? null
  const activeJobs =
    workOrdersQuery.data?.filter(
      (job) => job.status === 'pending' || job.status === 'scheduled' || job.status === 'in_progress',
    ).length ?? null
  const jobsToday =
    workOrdersQuery.data?.filter((job) => job.scheduled_date === today).length ?? null

  const outstandingMinor =
    workOrdersQuery.isSuccess && paymentsReady
      ? (workOrdersQuery.data ?? [])
          .filter((job) => job.status !== 'cancelled')
          .reduce((sum, job) => {
            const balance = calculatePaymentBalance(
              job.billable_amount,
              paidByWorkOrderId[job.id] ?? 0,
            ).balanceMinor
            return sum + Math.max(balance, 0)
          }, 0)
      : null

  const recentQuotes = (quotesQuery.data ?? []).slice(0, 5)
  const todayJobs = (workOrdersQuery.data ?? []).filter((job) => job.scheduled_date === today)

  const kpis: Array<{
    labelKey: MessageKey
    hintKey: MessageKey
    tone: keyof typeof toneClass
    value: string
    ready: boolean
    to: string
  }> = [
    {
      labelKey: 'dashboard.kpi.pendingQuotes',
      hintKey: 'dashboard.kpi.pendingHint',
      tone: 'warning',
      value: pendingQuotes === null ? t('common.emDash') : String(pendingQuotes),
      ready: quotesQuery.isSuccess,
      to: '/quotes?status=open',
    },
    {
      labelKey: 'dashboard.kpi.activeJobs',
      hintKey: 'dashboard.kpi.jobsHint',
      tone: 'primary',
      value: activeJobs === null ? t('common.emDash') : String(activeJobs),
      ready: workOrdersQuery.isSuccess,
      to: '/work-orders?status=active',
    },
    {
      labelKey: 'dashboard.kpi.outstanding',
      hintKey: 'dashboard.kpi.outstandingHint',
      tone: 'primary',
      value:
        outstandingMinor === null
          ? t('common.emDash')
          : formatMoney(outstandingMinor, currency, moneyLocale),
      ready: outstandingMinor !== null,
      to: '/work-orders?balance=unpaid',
    },
    {
      labelKey: 'dashboard.kpi.jobsToday',
      hintKey: 'dashboard.kpi.todayHint',
      tone: 'success',
      value: jobsToday === null ? t('common.emDash') : String(jobsToday),
      ready: workOrdersQuery.isSuccess,
      to: '/work-orders?scheduled=today',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.welcome', {
            name: organization?.name ?? t('nav.yourBusiness'),
          })}
        </p>
      </div>

      {guideVisible ? (
        <Card className="animate-fade-in-up">
          <CardHeader className="relative pr-12">
            <CardTitle>{t('guide.title')}</CardTitle>
            <CardDescription>{t('guide.subtitle')}</CardDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              aria-label={t('guide.closeAria')}
              onClick={() => {
                setDontShowAgain(false)
                setDismissOpen(true)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {guideSteps.map((step) => {
                const content = (
                  <div className="h-full rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40">
                    <p className="text-sm font-semibold text-foreground">{t(step.titleKey)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t(step.bodyKey)}</p>
                  </div>
                )

                return step.to ? (
                  <Link key={step.titleKey} to={step.to} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={step.titleKey}>{content}</div>
                )
              })}
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-foreground">{t('guide.comingSoonTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('guide.comingSoonBody')}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={dismissOpen}
        title={t('guide.dismissTitle')}
        description={t('guide.dismissBody')}
        confirmLabel={t('guide.dismissConfirm')}
        onCancel={() => setDismissOpen(false)}
        onConfirm={() => {
          if (dontShowAgain) {
            window.localStorage.setItem(GUIDE_STORAGE_KEY, '1')
          }
          setGuideVisible(false)
          setDismissOpen(false)
        }}
      >
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>{t('guide.dontShowAgain')}</span>
        </label>
      </ConfirmDialog>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Link
            key={kpi.labelKey}
            to={kpi.to}
            className="touch-card block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t(kpi.labelKey)} — ${t('dashboard.kpiOpen')}`}
          >
            <Card
              className={cn(
                'group animate-fade-in-up h-full transition-colors active:bg-accent/40 md:transition-all md:hover:-translate-y-0.5 md:hover:border-primary/30 md:hover:shadow-md',
                `stagger-${index + 1}`,
              )}
            >
              <CardHeader className="space-y-2 p-4 pb-2 sm:p-6 sm:pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardDescription className="text-xs sm:text-sm">{t(kpi.labelKey)}</CardDescription>
                  {!kpi.ready ? (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        toneClass[kpi.tone],
                      )}
                    >
                      {t('common.soon')}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-primary md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                      {t('dashboard.kpiOpen')}
                    </span>
                  )}
                </div>
                <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {kpi.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/70">
                  {t(kpi.hintKey)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in-up">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{t('dashboard.todayJobs')}</CardTitle>
              <CardDescription>{t('dashboard.todayJobsHint')}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/work-orders?scheduled=today">{t('dashboard.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {workOrdersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('workOrders.loading')}</p>
            ) : null}
            {workOrdersQuery.isSuccess && todayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.emptyTodayJobs')}</p>
            ) : null}
            {todayJobs.map((job) => (
              <Link
                key={job.id}
                to={`/work-orders/${job.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.customers?.name ?? t('common.emDash')}
                  </p>
                </div>
                <WorkOrderStatusBadge status={job.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{t('dashboard.recentQuotes')}</CardTitle>
              <CardDescription>{t('dashboard.recentQuotesHint')}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/quotes">{t('dashboard.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('quotes.loading')}</p>
            ) : null}
            {quotesQuery.isSuccess && recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.emptyQuotes')}</p>
            ) : null}
            {recentQuotes.map((quote) => (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {quote.quote_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {quote.customers?.name ?? t('common.emDash')} ·{' '}
                    {formatMoney(quote.total, currency, moneyLocale)}
                  </p>
                </div>
                <QuoteStatusBadge status={quote.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
