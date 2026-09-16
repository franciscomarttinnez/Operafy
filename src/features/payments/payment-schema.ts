import { z } from 'zod'
import type { MessageKey } from '@/i18n/types'
import { PAYMENT_METHODS, type PaymentMethod } from '@/features/payments/payment-method'
import { parseMajorAmountInput, toMinorUnits } from '@/lib/money'

type Translate = (key: MessageKey, params?: Record<string, string>) => string

export function createPaymentFormSchema(t: Translate) {
  return z
    .object({
      workOrderId: z.string().uuid(t('payments.selectWorkOrderRequired')),
      amount: z.string().trim().min(1, t('common.required')),
      method: z.enum(PAYMENT_METHODS),
      paidAt: z.string().trim().min(1, t('common.required')),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      try {
        const amount = parseMajorAmountInput(values.amount)
        if (amount <= 0) {
          throw new Error('non-positive')
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: t('payments.amountPositive'),
        })
      }
    })
}

export type PaymentFormValues = z.infer<ReturnType<typeof createPaymentFormSchema>>

export type PaymentWriteInput = {
  workOrderId: string
  amountMinor: number
  method: PaymentMethod
  paidAt: string
  notes?: string | null
}

export function toPaymentWriteInput(values: PaymentFormValues): PaymentWriteInput {
  const paidAt = values.paidAt.includes('T')
    ? new Date(values.paidAt).toISOString()
    : new Date(`${values.paidAt}T12:00:00`).toISOString()

  return {
    workOrderId: values.workOrderId,
    amountMinor: toMinorUnits(parseMajorAmountInput(values.amount)),
    method: values.method,
    paidAt,
    notes: values.notes.trim() || null,
  }
}
