import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPayment,
  deletePayment,
  getPayment,
  listAllPayments,
  listPayments,
  listPaymentsForCustomer,
  listPaymentsForWorkOrder,
  updatePayment,
} from '@/features/payments/payment-service'
import type {
  PaymentUpdateInput,
  PaymentWriteInput,
} from '@/features/payments/payment-schema'
import { useOrganization } from '@/features/organizations/use-organization'

export const paymentsQueryKey = (organizationId: string) =>
  ['payments', organizationId] as const
export const allPaymentsQueryKey = (organizationId: string) =>
  ['all-payments', organizationId] as const
export const customerPaymentsQueryKey = (organizationId: string, customerId: string) =>
  ['customer-payments', organizationId, customerId] as const
export const workOrderPaymentsQueryKey = (organizationId: string, workOrderId: string) =>
  ['work-order-payments', organizationId, workOrderId] as const
export const paymentQueryKey = (organizationId: string, paymentId: string) =>
  ['payment', organizationId, paymentId] as const

export function usePayments() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: paymentsQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listPayments(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

/**
 * Fetches the complete list of payments for the organization (no 50-row
 * cap). Use this for KPI/aggregate calculations and work-order paid-so-far
 * balances rather than `usePayments`, whose list is capped for display.
 */
export function useAllPayments() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: allPaymentsQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listAllPayments(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

export function usePayment(paymentId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: paymentQueryKey(organizationId ?? 'none', paymentId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !paymentId) {
        return null
      }
      return getPayment(organizationId, paymentId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(paymentId),
  })
}

export function useCustomerPayments(customerId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: customerPaymentsQueryKey(organizationId ?? 'none', customerId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !customerId) {
        return []
      }
      return listPaymentsForCustomer(organizationId, customerId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(customerId),
  })
}

/**
 * Aggregates every payment for the organization into a map of
 * `workOrderId -> total amount paid (minor units)`. Backed by `useAllPayments`
 * so the total is always correct, even for work orders with many payments.
 *
 * Shared by the dashboard, the work orders list, and the payment form pages
 * so the "amount already paid" logic lives in a single place.
 */
export function usePaidByWorkOrderId() {
  const paymentsQuery = useAllPayments()

  const paidByWorkOrderId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const payment of paymentsQuery.data ?? []) {
      map[payment.work_order_id] = (map[payment.work_order_id] ?? 0) + payment.amount
    }
    return map
  }, [paymentsQuery.data])

  return {
    paidByWorkOrderId,
    isLoading: paymentsQuery.isLoading,
    isSuccess: paymentsQuery.isSuccess,
    isError: paymentsQuery.isError,
    error: paymentsQuery.error,
  }
}

export function useWorkOrderPayments(workOrderId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: workOrderPaymentsQueryKey(organizationId ?? 'none', workOrderId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !workOrderId) {
        return []
      }
      return listPaymentsForWorkOrder(organizationId, workOrderId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(workOrderId),
  })
}

async function invalidatePaymentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['payments'] }),
    queryClient.invalidateQueries({ queryKey: ['all-payments'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-payments'] }),
    queryClient.invalidateQueries({ queryKey: ['work-order-payments'] }),
    queryClient.invalidateQueries({ queryKey: ['payment'] }),
  ])
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentWriteInput) => createPayment(input),
    onSuccess: async () => {
      await invalidatePaymentQueries(queryClient)
    },
  })
}

export function useUpdatePayment(paymentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentUpdateInput) => updatePayment(paymentId, input),
    onSuccess: async () => {
      await invalidatePaymentQueries(queryClient)
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => deletePayment(id),
    onSuccess: async () => {
      await invalidatePaymentQueries(queryClient)
    },
  })
}
