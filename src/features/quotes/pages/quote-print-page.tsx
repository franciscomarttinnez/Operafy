import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge'
import { useQuote } from '@/features/quotes/use-quotes'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { formatMoney } from '@/lib/money'

export function QuotePrintPage() {
  const { quoteId } = useParams<{ quoteId: string }>()
  const quoteQuery = useQuote(quoteId)
  const { organization } = useOrganization()
  const { t, locale } = useLocale()
  const currency = organization?.default_currency ?? 'USD'

  useEffect(() => {
    if (!quoteQuery.data) {
      return
    }
    const previousTitle = document.title
    document.title = `${quoteQuery.data.quote_number} — ${organization?.name ?? 'Operafy'}`
    return () => {
      document.title = previousTitle
    }
  }, [quoteQuery.data, organization?.name])

  if (quoteQuery.isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">{t('quotes.loadingOne')}</p>
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <p className="p-8 text-sm text-destructive">
        {quoteQuery.error instanceof Error ? quoteQuery.error.message : t('print.notFound')}
      </p>
    )
  }

  const quote = quoteQuery.data
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const created = new Date(quote.created_at).toLocaleDateString(moneyLocale)

  const openPrintDialog = () => {
    window.print()
  }

  return (
    <div className="min-h-svh bg-white text-slate-900 print:bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 space-y-3 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{t('print.friendlyHint')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={openPrintDialog}>
                {t('print.savePdf')}
              </Button>
              <Button type="button" variant="outline" onClick={openPrintDialog}>
                {t('print.print')}
              </Button>
            </div>
          </div>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {t('print.pdfHint')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <BrandMark className="h-10 w-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-semibold">
                  {organization?.name ?? t('print.businessFallback')}
                </h1>
                <p className="text-sm text-slate-600">{organization?.email}</p>
                <p className="text-sm text-slate-600">{organization?.phone}</p>
                <p className="text-sm text-slate-600">{organization?.address}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium text-slate-500">{t('print.quote')}</p>
              <p className="text-lg font-semibold">{quote.quote_number}</p>
              <p className="text-sm text-slate-600">{t('print.date', { date: created })}</p>
              <div className="mt-2 inline-flex print:hidden">
                <QuoteStatusBadge status={quote.status} />
              </div>
            </div>
          </header>

          <section className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-500">{t('print.billTo')}</h2>
              <p className="mt-1 font-medium">{quote.customers?.name}</p>
              <p className="text-sm text-slate-600">{quote.customers?.email}</p>
              <p className="text-sm text-slate-600">{quote.customers?.phone}</p>
              <p className="text-sm text-slate-600">{quote.customers?.address}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-500">{t('print.project')}</h2>
              <p className="mt-1 font-medium">{quote.title}</p>
              {quote.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{quote.notes}</p>
              ) : null}
            </div>
          </section>

          <section className="py-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">{t('print.description')}</th>
                  <th className="py-2 pr-3 font-medium">{t('print.qty')}</th>
                  <th className="py-2 pr-3 font-medium">{t('print.unit')}</th>
                  <th className="py-2 text-right font-medium">{t('print.total')}</th>
                </tr>
              </thead>
              <tbody>
                {quote.quote_line_items.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3">{line.description}</td>
                    <td className="py-3 pr-3">{line.quantity}</td>
                    <td className="py-3 pr-3">
                      {formatMoney(line.unit_price, currency, moneyLocale)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatMoney(line.line_total, currency, moneyLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">{t('print.subtotal')}</span>
              <span>{formatMoney(quote.subtotal, currency, moneyLocale)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">{t('print.discount')}</span>
              <span>-{formatMoney(quote.discount_amount, currency, moneyLocale)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">{t('print.tax')}</span>
              <span>{formatMoney(quote.tax_amount, currency, moneyLocale)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base font-semibold">
              <span>{t('print.total')}</span>
              <span>{formatMoney(quote.total, currency, moneyLocale)}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
