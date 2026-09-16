import { z } from 'zod'
import type { MessageKey } from '@/i18n/types'
import { parseMajorAmountInput, toMinorUnits } from '@/lib/money'

type Translate = (key: MessageKey) => string

export function createWorkOrderFormSchema(t: Translate) {
  return z
    .object({
      customerId: z.string().uuid(t('workOrders.selectCustomerRequired')),
      title: z.string().trim().min(2, t('workOrders.titleRequired')),
      description: z.string(),
      scheduledDate: z.string(),
      notes: z.string(),
      billableAmount: z.string().trim().min(1, t('common.required')),
    })
    .superRefine((values, ctx) => {
      try {
        const amount = parseMajorAmountInput(values.billableAmount)
        if (amount < 0) {
          throw new Error('negative')
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['billableAmount'],
          message: t('common.validAmount'),
        })
      }
    })
}

export type WorkOrderFormValues = z.infer<ReturnType<typeof createWorkOrderFormSchema>>

export type WorkOrderWriteInput = {
  customerId: string
  title: string
  description?: string | null
  scheduledDate?: string | null
  notes?: string | null
  billableAmountMinor: number
}

export type WorkOrderUpdateInput = {
  title: string
  description?: string | null
  scheduledDate?: string | null
  notes?: string | null
  billableAmountMinor?: number | null
}

export function toWorkOrderWriteInput(values: WorkOrderFormValues): WorkOrderWriteInput {
  return {
    customerId: values.customerId,
    title: values.title.trim(),
    description: values.description.trim() || null,
    scheduledDate: values.scheduledDate.trim() || null,
    notes: values.notes.trim() || null,
    billableAmountMinor: toMinorUnits(parseMajorAmountInput(values.billableAmount)),
  }
}

export function toWorkOrderUpdateInput(
  values: WorkOrderFormValues,
  options: { hasQuote: boolean },
): WorkOrderUpdateInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    scheduledDate: values.scheduledDate.trim() || null,
    notes: values.notes.trim() || null,
    billableAmountMinor: options.hasQuote
      ? null
      : toMinorUnits(parseMajorAmountInput(values.billableAmount)),
  }
}
