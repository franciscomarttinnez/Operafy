import { getSupabaseClient } from '@/lib/supabase'
import { throwSupabaseError, type SupabaseErrorLike } from '@/lib/errors'
import type { QuoteWriteInput } from '@/features/quotes/quote-schema'
import type { QuoteStatus } from '@/features/quotes/quote-status'
import type { Quote, QuoteDetail, QuoteWithCustomer } from '@/types/database'

function throwQuoteDbError(error: SupabaseErrorLike): never {
  throwSupabaseError(error, {
    missingFunction:
      'Quotes database setup is missing. Run supabase/migrations/005_quotes.sql in the Supabase SQL Editor, then try again.',
  })
}

const QUOTE_LIST_PAGE_SIZE = 50
const QUOTE_AGGREGATE_PAGE_SIZE = 500

export async function listQuotes(organizationId: string): Promise<QuoteWithCustomer[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customers(id, name, email, phone, address)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(QUOTE_LIST_PAGE_SIZE)

  if (error) {
    throwQuoteDbError(error)
  }

  return (data ?? []) as QuoteWithCustomer[]
}

/**
 * Fetches every quote for the organization, paginated in large batches.
 * Used for KPI/aggregate calculations (dashboard) where `listQuotes`'s fixed
 * page size would silently undercount once an org has more than 50 quotes.
 */
export async function listAllQuotes(organizationId: string): Promise<QuoteWithCustomer[]> {
  const supabase = getSupabaseClient()
  const rows: QuoteWithCustomer[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(id, name, email, phone, address)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, from + QUOTE_AGGREGATE_PAGE_SIZE - 1)

    if (error) {
      throwQuoteDbError(error)
    }

    const batch = (data ?? []) as QuoteWithCustomer[]
    rows.push(...batch)

    if (batch.length < QUOTE_AGGREGATE_PAGE_SIZE) {
      break
    }
    from += QUOTE_AGGREGATE_PAGE_SIZE
  }

  return rows
}

export async function listQuotesForCustomer(
  organizationId: string,
  customerId: string,
): Promise<Quote[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throwQuoteDbError(error)
  }

  return data ?? []
}

export async function getQuoteDetail(
  organizationId: string,
  quoteId: string,
): Promise<QuoteDetail | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customers(id, name, email, phone, address), quote_line_items(*)')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle()

  if (error) {
    throwQuoteDbError(error)
  }

  if (!data) {
    return null
  }

  const detail = data as QuoteDetail
  detail.quote_line_items = [...(detail.quote_line_items ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  return detail
}

export async function createQuote(input: QuoteWriteInput): Promise<Quote> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_quote', {
    p_customer_id: input.customerId,
    p_title: input.title,
    p_notes: input.notes ?? null,
    p_tax_amount: input.taxAmountMinor,
    p_discount_amount: input.discountAmountMinor,
    p_line_items: input.lineItems,
  })

  if (error) {
    throwQuoteDbError(error)
  }
  if (!data) {
    throw new Error('Quote was not returned by the database.')
  }
  return data
}

export async function updateQuote(quoteId: string, input: QuoteWriteInput): Promise<Quote> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('update_quote', {
    p_quote_id: quoteId,
    p_customer_id: input.customerId,
    p_title: input.title,
    p_notes: input.notes ?? null,
    p_tax_amount: input.taxAmountMinor,
    p_discount_amount: input.discountAmountMinor,
    p_line_items: input.lineItems,
  })

  if (error) {
    throwQuoteDbError(error)
  }
  if (!data) {
    throw new Error('Quote was not returned by the database.')
  }
  return data
}

export async function setQuoteStatus(quoteId: string, status: QuoteStatus): Promise<Quote> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('set_quote_status', {
    p_quote_id: quoteId,
    p_status: status,
  })

  if (error) {
    throwQuoteDbError(error)
  }
  if (!data) {
    throw new Error('Quote was not returned by the database.')
  }
  return data
}

export async function deleteQuote(quoteId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('delete_quote', {
    p_quote_id: quoteId,
  })

  if (error) {
    throwQuoteDbError(error)
  }
}
