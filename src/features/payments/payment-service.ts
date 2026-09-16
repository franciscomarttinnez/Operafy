import { getSupabaseClient } from '@/lib/supabase'
import type { PaymentWriteInput } from '@/features/payments/payment-schema'
import type { Payment, PaymentWithRelations } from '@/types/database'

function formatSupabaseError(error: {
  message?: string
  details?: string
  hint?: string
  code?: string
}): string {
  const parts = [error.message, error.details, error.hint, error.code ? `(${error.code})` : null]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))

  if (parts.length === 0) {
    return 'Unexpected database error.'
  }

  return parts.join(' — ')
}

function throwPaymentDbError(error: {
  message?: string
  details?: string
  hint?: string
  code?: string
}): never {
  const message = formatSupabaseError(error)
  const lower = message.toLowerCase()

  if (
    error.code === 'PGRST202' ||
    lower.includes('could not find the function') ||
    lower.includes('schema cache')
  ) {
    throw new Error(
      'Payments database setup is missing. Run supabase/migrations/008_payments.sql in the Supabase SQL Editor, then try again.',
    )
  }

  if (
    error.code === 'PGRST205' ||
    lower.includes("could not find the table 'public.payments'")
  ) {
    throw new Error(
      'Payments table is missing. Run supabase/migrations/008_payments.sql in the Supabase SQL Editor, then try again.',
    )
  }

  throw new Error(message)
}

export async function listPayments(organizationId: string): Promise<PaymentWithRelations[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(id, name), work_orders(id, title, billable_amount, status)')
    .eq('organization_id', organizationId)
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) {
    throwPaymentDbError(error)
  }

  return (data ?? []) as PaymentWithRelations[]
}

export async function listPaymentsForCustomer(
  organizationId: string,
  customerId: string,
): Promise<Payment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('paid_at', { ascending: false })
    .limit(20)

  if (error) {
    throwPaymentDbError(error)
  }

  return data ?? []
}

export async function listPaymentsForWorkOrder(
  organizationId: string,
  workOrderId: string,
): Promise<Payment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('work_order_id', workOrderId)
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) {
    throwPaymentDbError(error)
  }

  return data ?? []
}

export async function createPayment(input: PaymentWriteInput): Promise<Payment> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_payment', {
    p_work_order_id: input.workOrderId,
    p_amount: input.amountMinor,
    p_method: input.method,
    p_paid_at: input.paidAt,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throwPaymentDbError(error)
  }

  if (!data) {
    throw new Error('Payment was not returned by the database.')
  }

  return data
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('delete_payment', {
    p_payment_id: paymentId,
  })

  if (error) {
    throwPaymentDbError(error)
  }
}
