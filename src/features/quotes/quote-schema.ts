import { z } from 'zod'
import type { MessageKey } from '@/i18n/types'
import { parseMajorAmountInput, toMinorUnits } from '@/lib/money'

type Translate = (key: MessageKey) => string

function createMoneyInputSchema(t: Translate) {
  return z
    .string()
    .trim()
    .min(1, t('common.required'))
    .refine((value) => {
      try {
        parseMajorAmountInput(value)
        return true
      } catch {
        return false
      }
    }, t('common.validAmount'))
}

export function createQuoteFormSchema(t: Translate) {
  const moneyInputSchema = createMoneyInputSchema(t)

  const quoteLineFormSchema = z.object({
    description: z.string().trim().min(1, t('quotes.descriptionRequired')),
    quantity: z
      .string()
      .trim()
      .min(1, t('common.required'))
      .refine((value) => {
        const parsed = Number(value.replace(',', '.'))
        return Number.isFinite(parsed) && parsed > 0
      }, t('quotes.quantityPositive')),
    unitPrice: moneyInputSchema,
  })

  return z.object({
    customerId: z.string().uuid(t('quotes.selectCustomerRequired')),
    title: z.string().trim().min(2, t('quotes.titleRequired')),
    notes: z.string(),
    taxAmount: moneyInputSchema,
    discountAmount: moneyInputSchema,
    lines: z.array(quoteLineFormSchema).min(1, t('quotes.atLeastOneLine')),
  })
}

export type QuoteFormValues = z.infer<ReturnType<typeof createQuoteFormSchema>>

export type QuoteWriteInput = {
  customerId: string
  title: string
  notes?: string | null
  taxAmountMinor: number
  discountAmountMinor: number
  lineItems: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
}

export function toQuoteWriteInput(values: QuoteFormValues): QuoteWriteInput {
  return {
    customerId: values.customerId,
    title: values.title.trim(),
    notes: values.notes.trim() || null,
    taxAmountMinor: toMinorUnits(parseMajorAmountInput(values.taxAmount)),
    discountAmountMinor: toMinorUnits(parseMajorAmountInput(values.discountAmount)),
    lineItems: values.lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity.replace(',', '.')),
      unit_price: toMinorUnits(parseMajorAmountInput(line.unitPrice)),
    })),
  }
}
