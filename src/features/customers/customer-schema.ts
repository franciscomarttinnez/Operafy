import { z } from 'zod'
import type { MessageKey } from '@/i18n/types'

type Translate = (key: MessageKey) => string

export function createCustomerFormSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(2, t('customers.nameRequired')),
    phone: z.string(),
    email: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || z.email().safeParse(value).success,
        t('common.validEmail'),
      ),
    address: z.string(),
    notes: z.string(),
  })
}

export type CustomerFormValues = z.infer<ReturnType<typeof createCustomerFormSchema>>

export type CustomerWriteInput = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}
