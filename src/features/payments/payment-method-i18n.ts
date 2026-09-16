import type { MessageKey } from '@/i18n/types'
import type { PaymentMethod } from '@/features/payments/payment-method'

export const paymentMethodLabelKeys: Record<PaymentMethod, MessageKey> = {
  cash: 'payments.method.cash',
  transfer: 'payments.method.transfer',
  card: 'payments.method.card',
  other: 'payments.method.other',
}
