import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPayment,
  deletePayment,
  listPayments,
  listPaymentsForCustomer,
  listPaymentsForWorkOrder,
} from '@/features/payments/payment-service'
import type { PaymentWriteInput } from '@/features/payments/payment-schema'
import { useOrganization } from '@/features/organizations/use-organization'

export const paymentsQueryKey = (organizationId: string) =>
  ['payments', organizationId] as const
export const customerPaymentsQueryKey = (organizationId: string, customerId: string) =>
  ['customer-payments', organizationId, customerId] as const
export const workOrderPaymentsQueryKey = (organizationId: string, workOrderId: string) =>
  ['work-order-payments', organizationId, workOrderId] as const

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
    queryClient.invalidateQueries({ queryKey: ['customer-payments'] }),
    queryClient.invalidateQueries({ queryKey: ['work-order-payments'] }),
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

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => deletePayment(paymentId),
    onSuccess: async () => {
      await invalidatePaymentQueries(queryClient)
    },
  })
}
