export const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'other'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
