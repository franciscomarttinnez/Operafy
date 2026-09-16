import { getSupabaseClient } from '@/lib/supabase'
import type {
  WorkOrderUpdateInput,
  WorkOrderWriteInput,
} from '@/features/work-orders/work-order-schema'
import type { WorkOrderStatus } from '@/features/work-orders/work-order-status'
import type { WorkOrder, WorkOrderWithCustomer } from '@/types/database'

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

function throwWorkOrderDbError(error: {
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
      'Work orders database setup is missing. Run supabase/migrations/007_work_orders.sql in the Supabase SQL Editor, then try again.',
    )
  }

  if (
    error.code === 'PGRST205' ||
    lower.includes("could not find the table 'public.work_orders'")
  ) {
    throw new Error(
      'Work orders table is missing. Run supabase/migrations/007_work_orders.sql in the Supabase SQL Editor, then try again.',
    )
  }

  throw new Error(message)
}

export async function listWorkOrders(organizationId: string): Promise<WorkOrderWithCustomer[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('work_orders')
    .select(
      '*, customers(id, name, email, phone, address), quotes(id, quote_number, title, total, status)',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throwWorkOrderDbError(error)
  }

  return (data ?? []) as WorkOrderWithCustomer[]
}

export async function listWorkOrdersForCustomer(
  organizationId: string,
  customerId: string,
): Promise<WorkOrder[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throwWorkOrderDbError(error)
  }

  return data ?? []
}

export async function getWorkOrder(
  organizationId: string,
  workOrderId: string,
): Promise<WorkOrderWithCustomer | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('work_orders')
    .select(
      '*, customers(id, name, email, phone, address), quotes(id, quote_number, title, total, status)',
    )
    .eq('organization_id', organizationId)
    .eq('id', workOrderId)
    .maybeSingle()

  if (error) {
    throwWorkOrderDbError(error)
  }

  return data as WorkOrderWithCustomer | null
}

export async function getWorkOrderForQuote(
  organizationId: string,
  quoteId: string,
): Promise<WorkOrder | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('quote_id', quoteId)
    .maybeSingle()

  if (error) {
    throwWorkOrderDbError(error)
  }

  return data
}

export async function createWorkOrder(input: WorkOrderWriteInput): Promise<WorkOrder> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_work_order', {
    p_customer_id: input.customerId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_billable_amount: input.billableAmountMinor,
    p_scheduled_date: input.scheduledDate ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throwWorkOrderDbError(error)
  }

  if (!data) {
    throw new Error('Work order was not returned by the database.')
  }

  return data
}

export async function createWorkOrderFromQuote(input: {
  quoteId: string
  scheduledDate?: string | null
  notes?: string | null
}): Promise<WorkOrder> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_work_order_from_quote', {
    p_quote_id: input.quoteId,
    p_scheduled_date: input.scheduledDate ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throwWorkOrderDbError(error)
  }

  if (!data) {
    throw new Error('Work order was not returned by the database.')
  }

  return data
}

export async function updateWorkOrder(
  workOrderId: string,
  input: WorkOrderUpdateInput,
): Promise<WorkOrder> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('update_work_order', {
    p_work_order_id: workOrderId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_scheduled_date: input.scheduledDate ?? null,
    p_notes: input.notes ?? null,
    p_billable_amount: input.billableAmountMinor ?? null,
  })

  if (error) {
    throwWorkOrderDbError(error)
  }

  if (!data) {
    throw new Error('Work order was not returned by the database.')
  }

  return data
}

export async function setWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
): Promise<WorkOrder> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('set_work_order_status', {
    p_work_order_id: workOrderId,
    p_status: status,
  })

  if (error) {
    throwWorkOrderDbError(error)
  }

  if (!data) {
    throw new Error('Work order was not returned by the database.')
  }

  return data
}

export async function deleteWorkOrder(workOrderId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('delete_work_order', {
    p_work_order_id: workOrderId,
  })

  if (error) {
    throwWorkOrderDbError(error)
  }
}
