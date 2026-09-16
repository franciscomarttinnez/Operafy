import { getSupabaseClient } from '@/lib/supabase'
import { formatSupabaseError, throwSupabaseError, type SupabaseErrorLike } from '@/lib/errors'
import type { CustomerWriteInput } from '@/features/customers/customer-schema'
import type { Customer } from '@/types/database'

const CUSTOMER_PAGE_SIZE = 50

export type ListCustomersParams = {
  organizationId: string
  search?: string
}

function throwCustomerDbError(error: SupabaseErrorLike): never {
  const lower = formatSupabaseError(error).toLowerCase()

  if (lower.includes('existing quotes')) {
    throw new Error(
      'Cannot delete customer with existing quotes. Delete or reassign quotes first.',
    )
  }

  throwSupabaseError(error, {
    missingFunction:
      'Database is missing customer functions. Run supabase/migrations/004_customers_rpc.sql in the Supabase SQL Editor, then try again.',
    missingTable:
      'Customers table is missing. Run supabase/migrations/004_customers_rpc.sql in the Supabase SQL Editor, then try again.',
  })
}

export async function listCustomers(
  params: ListCustomersParams,
): Promise<Customer[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('customers')
    .select('*')
    .eq('organization_id', params.organizationId)
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_PAGE_SIZE)

  const search = params.search?.trim()
  if (search) {
    const sanitized = search.replace(/[%_,.()]/g, ' ').trim()
    if (sanitized) {
      const pattern = `%${sanitized}%`
      query = query.or(
        `name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`,
      )
    }
  }

  const { data, error } = await query
  if (error) {
    throwCustomerDbError(error)
  }

  return data ?? []
}

export async function getCustomer(
  organizationId: string,
  customerId: string,
): Promise<Customer | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', customerId)
    .maybeSingle()

  if (error) {
    throwCustomerDbError(error)
  }

  return data
}

export async function createCustomer(input: CustomerWriteInput): Promise<Customer> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_customer', {
    p_name: input.name.trim(),
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throwCustomerDbError(error)
  }

  if (!data) {
    throw new Error('Customer was not returned by the database.')
  }

  return data
}

export async function updateCustomer(
  customerId: string,
  input: CustomerWriteInput,
): Promise<Customer> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('update_customer', {
    p_customer_id: customerId,
    p_name: input.name.trim(),
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throwCustomerDbError(error)
  }

  if (!data) {
    throw new Error('Customer was not returned by the database.')
  }

  return data
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('delete_customer', {
    p_customer_id: customerId,
  })

  if (error) {
    throwCustomerDbError(error)
  }
}
