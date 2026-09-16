import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuote,
  deleteQuote,
  getQuoteDetail,
  listQuotes,
  listQuotesForCustomer,
  setQuoteStatus,
  updateQuote,
} from '@/features/quotes/quote-service'
import type { QuoteWriteInput } from '@/features/quotes/quote-schema'
import type { QuoteStatus } from '@/features/quotes/quote-status'
import { useOrganization } from '@/features/organizations/use-organization'

export const quotesQueryKey = (organizationId: string) => ['quotes', organizationId] as const
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

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuoteWriteInput) => createQuote(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-quotes'] })
    },
  })
}

export function useUpdateQuote(quoteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuoteWriteInput) => updateQuote(quoteId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-quotes'] })
    },
  })
}

export function useSetQuoteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { quoteId: string; status: QuoteStatus }) =>
      setQuoteStatus(input.quoteId, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-quotes'] })
    },
  })
}

export function useDeleteQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quoteId: string) => deleteQuote(quoteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-quotes'] })
    },
  })
}
