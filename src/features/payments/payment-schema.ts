import { z } from 'zod'
import type { MessageKey } from '@/i18n/types'
import { PAYMENT_METHODS, type PaymentMethod } from '@/features/payments/payment-method'
import { fromMinorUnits, parseMajorAmountInput, toMinorUnits } from '@/lib/money'

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

export type PaymentUpdateInput = {
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

export function toPaymentUpdateInput(values: PaymentFormValues): PaymentUpdateInput {
  const paidAt = values.paidAt.includes('T')
    ? new Date(values.paidAt).toISOString()
    : new Date(`${values.paidAt}T12:00:00`).toISOString()

  return {
    amountMinor: toMinorUnits(parseMajorAmountInput(values.amount)),
    method: values.method,
    paidAt,
    notes: values.notes.trim() || null,
  }
}

function toDateInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function paymentToFormValues(payment: {
  work_order_id: string
  amount: number
  method: PaymentMethod
  paid_at: string
  notes: string | null
}): PaymentFormValues {
  return {
    workOrderId: payment.work_order_id,
    amount: String(fromMinorUnits(payment.amount)),
    method: payment.method,
    paidAt: toDateInputValue(payment.paid_at),
    notes: payment.notes ?? '',
  }
}
