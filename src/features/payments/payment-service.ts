import { getSupabaseClient } from '@/lib/supabase'
import { throwSupabaseError, type SupabaseErrorLike } from '@/lib/errors'
import type {
  PaymentUpdateInput,
  PaymentWriteInput,
} from '@/features/payments/payment-schema'
import type { Payment, PaymentWithRelations } from '@/types/database'

function throwPaymentDbError(error: SupabaseErrorLike): never {
  throwSupabaseError(error, {
    missingFunction:
      'Payments database setup is missing. Run supabase/migrations/008_payments.sql and 010_payment_update_and_seed.sql in the Supabase SQL Editor, then try again.',
    missingTable:
      'Payments table is missing. Run supabase/migrations/008_payments.sql in the Supabase SQL Editor, then try again.',
  })
}

const PAYMENT_LIST_PAGE_SIZE = 50
const PAYMENT_AGGREGATE_PAGE_SIZE = 500

export async function listPayments(organizationId: string): Promise<PaymentWithRelations[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(id, name), work_orders(id, title, billable_amount, status)')
    .eq('organization_id', organizationId)
    .order('paid_at', { ascending: false })
    .limit(PAYMENT_LIST_PAGE_SIZE)

  if (error) {
    throwPaymentDbError(error)
  }

  return (data ?? []) as PaymentWithRelations[]
}

/**
 * Fetches every payment for the organization, paginated in large batches.
 * Used for KPI/aggregate calculations (dashboard, work order paid-so-far
 * balances) where `listPayments`'s fixed page size would silently undercount
 * once an org has more than 50 payments.
 */
export async function listAllPayments(organizationId: string): Promise<PaymentWithRelations[]> {
  const supabase = getSupabaseClient()
  const rows: PaymentWithRelations[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customers(id, name), work_orders(id, title, billable_amount, status)')
      .eq('organization_id', organizationId)
      .order('paid_at', { ascending: false })
      .range(from, from + PAYMENT_AGGREGATE_PAGE_SIZE - 1)

    if (error) {
      throwPaymentDbError(error)
    }

    const batch = (data ?? []) as PaymentWithRelations[]
    rows.push(...batch)

    if (batch.length < PAYMENT_AGGREGATE_PAGE_SIZE) {
      break
    }
    from += PAYMENT_AGGREGATE_PAGE_SIZE
  }

  return rows
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

export async function getPayment(
  organizationId: string,
  paymentId: string,
): Promise<PaymentWithRelations | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(id, name), work_orders(id, title, billable_amount, status)')
    .eq('organization_id', organizationId)
    .eq('id', paymentId)
    .maybeSingle()

  if (error) {
    throwPaymentDbError(error)
  }

  return (data as PaymentWithRelations | null) ?? null
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

export async function updatePayment(
  paymentId: string,
  input: PaymentUpdateInput,
): Promise<Payment> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('update_payment', {
    p_payment_id: paymentId,
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
