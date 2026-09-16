import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuote,
  deleteQuote,
  getQuoteDetail,
  listAllQuotes,
  listQuotes,
  listQuotesForCustomer,
  setQuoteStatus,
  updateQuote,
} from '@/features/quotes/quote-service'
import type { QuoteWriteInput } from '@/features/quotes/quote-schema'
import type { QuoteStatus } from '@/features/quotes/quote-status'
import { useOrganization } from '@/features/organizations/use-organization'

export const quotesQueryKey = (organizationId: string) => ['quotes', organizationId] as const
export const allQuotesQueryKey = (organizationId: string) =>
  ['all-quotes', organizationId] as const
export const quoteQueryKey = (organizationId: string, quoteId: string) =>
  ['quote', organizationId, quoteId] as const
export const customerQuotesQueryKey = (organizationId: string, customerId: string) =>
  ['customer-quotes', organizationId, customerId] as const

export function useQuotes() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: quotesQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listQuotes(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

/**
 * Fetches the complete list of quotes for the organization (no 50-row cap).
 * Use this for KPI/aggregate calculations (e.g. dashboard) rather than
 * `useQuotes`, whose list is capped for display performance.
 */
export function useAllQuotes() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: allQuotesQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listAllQuotes(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

export function useQuote(quoteId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: quoteQueryKey(organizationId ?? 'none', quoteId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !quoteId) {
        return null
      }
      return getQuoteDetail(organizationId, quoteId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(quoteId),
  })
}

export function useCustomerQuotes(customerId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: customerQuotesQueryKey(organizationId ?? 'none', customerId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !customerId) {
        return []
      }
      return listQuotesForCustomer(organizationId, customerId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(customerId),
  })
}

async function invalidateQuoteQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['quotes'] }),
    queryClient.invalidateQueries({ queryKey: ['all-quotes'] }),
    queryClient.invalidateQueries({ queryKey: ['quote'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-quotes'] }),
  ])
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuoteWriteInput) => createQuote(input),
    onSuccess: async () => {
      await invalidateQuoteQueries(queryClient)
    },
  })
}

export function useUpdateQuote(quoteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuoteWriteInput) => updateQuote(quoteId, input),
    onSuccess: async () => {
      await invalidateQuoteQueries(queryClient)
    },
  })
}

export function useSetQuoteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { quoteId: string; status: QuoteStatus }) =>
      setQuoteStatus(input.quoteId, input.status),
    onSuccess: async () => {
      await invalidateQuoteQueries(queryClient)
    },
  })
}

export function useDeleteQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quoteId: string) => deleteQuote(quoteId),
    onSuccess: async () => {
      await invalidateQuoteQueries(queryClient)
    },
  })
}
