import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkOrder,
  createWorkOrderFromQuote,
  deleteWorkOrder,
  getWorkOrder,
  getWorkOrderForQuote,
  listAllWorkOrders,
  listWorkOrders,
  listWorkOrdersForCustomer,
  setWorkOrderStatus,
  updateWorkOrder,
} from '@/features/work-orders/work-order-service'
import type {
  WorkOrderUpdateInput,
  WorkOrderWriteInput,
} from '@/features/work-orders/work-order-schema'
import type { WorkOrderStatus } from '@/features/work-orders/work-order-status'
import { useOrganization } from '@/features/organizations/use-organization'

export const workOrdersQueryKey = (organizationId: string) =>
  ['work-orders', organizationId] as const
export const allWorkOrdersQueryKey = (organizationId: string) =>
  ['all-work-orders', organizationId] as const
export const workOrderQueryKey = (organizationId: string, workOrderId: string) =>
  ['work-order', organizationId, workOrderId] as const
export const customerWorkOrdersQueryKey = (organizationId: string, customerId: string) =>
  ['customer-work-orders', organizationId, customerId] as const
export const quoteWorkOrderQueryKey = (organizationId: string, quoteId: string) =>
  ['quote-work-order', organizationId, quoteId] as const

export function useWorkOrders() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: workOrdersQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listWorkOrders(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

/**
 * Fetches the complete list of work orders for the organization (no 50-row
 * cap). Use this for KPI/aggregate calculations (e.g. dashboard, payment
 * balances) rather than `useWorkOrders`, whose list is capped for display.
 */
export function useAllWorkOrders() {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: allWorkOrdersQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listAllWorkOrders(organizationId)
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

export function useWorkOrder(workOrderId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: workOrderQueryKey(organizationId ?? 'none', workOrderId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !workOrderId) {
        return null
      }
      return getWorkOrder(organizationId, workOrderId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(workOrderId),
  })
}

export function useCustomerWorkOrders(customerId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: customerWorkOrdersQueryKey(organizationId ?? 'none', customerId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !customerId) {
        return []
      }
      return listWorkOrdersForCustomer(organizationId, customerId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(customerId),
  })
}

export function useQuoteWorkOrder(quoteId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery({
    queryKey: quoteWorkOrderQueryKey(organizationId ?? 'none', quoteId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !quoteId) {
        return null
      }
      return getWorkOrderForQuote(organizationId, quoteId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(quoteId),
  })
}

async function invalidateWorkOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    queryClient.invalidateQueries({ queryKey: ['all-work-orders'] }),
    queryClient.invalidateQueries({ queryKey: ['work-order'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-work-orders'] }),
    queryClient.invalidateQueries({ queryKey: ['quote-work-order'] }),
  ])
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: WorkOrderWriteInput) => createWorkOrder(input),
    onSuccess: async () => {
      await invalidateWorkOrderQueries(queryClient)
    },
  })
}

export function useCreateWorkOrderFromQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      quoteId: string
      scheduledDate?: string | null
      notes?: string | null
    }) => createWorkOrderFromQuote(input),
    onSuccess: async () => {
      await invalidateWorkOrderQueries(queryClient)
    },
  })
}

export function useUpdateWorkOrder(workOrderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: WorkOrderUpdateInput) => updateWorkOrder(workOrderId, input),
    onSuccess: async () => {
      await invalidateWorkOrderQueries(queryClient)
    },
  })
}

export function useSetWorkOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { workOrderId: string; status: WorkOrderStatus }) =>
      setWorkOrderStatus(input.workOrderId, input.status),
    onSuccess: async () => {
      await invalidateWorkOrderQueries(queryClient)
    },
  })
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (workOrderId: string) => deleteWorkOrder(workOrderId),
    onSuccess: async () => {
      await invalidateWorkOrderQueries(queryClient)
    },
  })
}
