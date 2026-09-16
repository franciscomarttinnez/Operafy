import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/customer-picker'
import {
  createQuoteFormSchema,
  toQuoteWriteInput,
  type QuoteFormValues,
  type QuoteWriteInput,
} from '@/features/quotes/quote-schema'
import { useLocale } from '@/i18n/use-locale'
import {
  calculateQuoteTotals,
  formatMoney,
  fromMinorUnits,
  parseMajorAmountInput,
  toMinorUnits,
} from '@/lib/money'
import type { QuoteDetail } from '@/types/database'

type QuoteFormProps = {
  initialQuote?: QuoteDetail | null
  submitLabel: string
  onSubmit: (input: QuoteWriteInput) => Promise<void>
  onCancel: () => void
  currencyCode?: string
}

function toFormValues(quote?: QuoteDetail | null): QuoteFormValues {
  if (!quote) {
    return {
      customerId: '',
      title: '',
      notes: '',
      taxAmount: '0',
      discountAmount: '0',
      lines: [{ description: '', quantity: '1', unitPrice: '0' }],
    }
  }

  return {
    customerId: quote.customer_id,
    title: quote.title,
    notes: quote.notes ?? '',
    taxAmount: String(fromMinorUnits(quote.tax_amount)),
    discountAmount: String(fromMinorUnits(quote.discount_amount)),
    lines:
      quote.quote_line_items.length > 0
        ? quote.quote_line_items.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(fromMinorUnits(line.unit_price)),
          }))
        : [{ description: '', quantity: '1', unitPrice: '0' }],
  }
}

export function QuoteForm({
  initialQuote,
  submitLabel,
  onSubmit,
  onCancel,
  currencyCode = 'USD',
}: QuoteFormProps) {
  const { t } = useLocale()
  const schema = useMemo(() => createQuoteFormSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initialQuote),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const watched = useWatch({ control })

  let previewTotalLabel = t('common.emDash')
  try {
    const lines = (watched.lines ?? [])
      .map((line) => {
        if (!line?.description?.trim() || !line.quantity || !line.unitPrice) {
          return null
        }
        return {
          description: line.description,
          quantity: Number(String(line.quantity).replace(',', '.')),
          unitPriceMinor: toMinorUnits(parseMajorAmountInput(String(line.unitPrice))),
        }
      })
      .filter((line): line is NonNullable<typeof line> => line !== null)

    if (lines.length > 0) {
      const totals = calculateQuoteTotals({
        lines,
        taxAmountMinor: toMinorUnits(parseMajorAmountInput(String(watched.taxAmount || '0'))),
        discountAmountMinor: toMinorUnits(
          parseMajorAmountInput(String(watched.discountAmount || '0')),
        ),
      })
      previewTotalLabel = formatMoney(totals.totalMinor, currencyCode)
    }
  } catch {
    previewTotalLabel = t('common.emDash')
  }

  const submit = handleSubmit(async (values) => {
    await onSubmit(toQuoteWriteInput(values))
  })

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customerId">{t('quotes.customer')}</Label>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <CustomerPicker
                id="customerId"
                value={field.value}
                onChange={field.onChange}
                selectedCustomer={initialQuote?.customers ?? null}
              />
            )}
          />
          {errors.customerId ? (
            <p className="text-sm text-destructive">{errors.customerId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">{t('quotes.titleLabel')}</Label>
          <Input id="title" {...register('title')} placeholder={t('quotes.titlePlaceholder')} />
          {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{t('quotes.lineItems')}</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', quantity: '1', unitPrice: '0' })}
          >
            <Plus className="h-4 w-4" />
            {t('quotes.addLine')}
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_6rem_8rem_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`lines.${index}.description`}>{t('quotes.description')}</Label>
                <Input
                  id={`lines.${index}.description`}
                  {...register(`lines.${index}.description`)}
                />
                {errors.lines?.[index]?.description ? (
                  <p className="text-sm text-destructive">
                    {errors.lines[index]?.description?.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`lines.${index}.quantity`}>{t('quotes.qty')}</Label>
                <Input id={`lines.${index}.quantity`} {...register(`lines.${index}.quantity`)} />
                {errors.lines?.[index]?.quantity ? (
                  <p className="text-sm text-destructive">
                    {errors.lines[index]?.quantity?.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`lines.${index}.unitPrice`}>{t('quotes.unitPrice')}</Label>
                <Input
                  id={`lines.${index}.unitPrice`}
                  {...register(`lines.${index}.unitPrice`)}
                  inputMode="decimal"
                />
                {errors.lines?.[index]?.unitPrice ? (
                  <p className="text-sm text-destructive">
                    {errors.lines[index]?.unitPrice?.message}
                  </p>
                ) : null}
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('quotes.removeLine')}
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {errors.lines?.root ? (
          <p className="text-sm text-destructive">{errors.lines.root.message}</p>
        ) : null}
        {typeof errors.lines?.message === 'string' ? (
          <p className="text-sm text-destructive">{errors.lines.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discountAmount">{t('quotes.discount')}</Label>
          <Input id="discountAmount" inputMode="decimal" {...register('discountAmount')} />
          {errors.discountAmount ? (
            <p className="text-sm text-destructive">{errors.discountAmount.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">{t('quotes.tax')}</Label>
          <Input id="taxAmount" inputMode="decimal" {...register('taxAmount')} />
          {errors.taxAmount ? (
            <p className="text-sm text-destructive">{errors.taxAmount.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('quotes.notes')}</Label>
        <Textarea id="notes" {...register('notes')} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-accent/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t('quotes.estimatedTotal')}</p>
        <p className="text-lg font-semibold text-foreground">{previewTotalLabel}</p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  )
}
