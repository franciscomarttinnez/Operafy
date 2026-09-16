import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '@/features/customers/customer-service'
import type { CustomerWriteInput } from '@/features/customers/customer-schema'
import { useOrganization } from '@/features/organizations/use-organization'
import type { Customer } from '@/types/database'

export const customersQueryKey = (organizationId: string, search: string) =>
  ['customers', organizationId, search] as const

export const customerQueryKey = (organizationId: string, customerId: string) =>
  ['customer', organizationId, customerId] as const

export function useCustomers(search: string) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery<Customer[]>({
    queryKey: customersQueryKey(organizationId ?? 'none', search.trim()),
    queryFn: async () => {
      if (!organizationId) {
        return []
      }
      return listCustomers({ organizationId, search })
    },
    enabled: hasOrganization && Boolean(organizationId),
  })
}

export function useCustomer(customerId: string | undefined) {
  const { organization, hasOrganization } = useOrganization()
  const organizationId = organization?.id

  return useQuery<Customer | null>({
    queryKey: customerQueryKey(organizationId ?? 'none', customerId ?? 'none'),
    queryFn: async () => {
      if (!organizationId || !customerId) {
        return null
      }
      return getCustomer(organizationId, customerId)
    },
    enabled: hasOrganization && Boolean(organizationId) && Boolean(customerId),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()

  return useMutation({
    mutationFn: async (input: CustomerWriteInput) => createCustomer(input),
    onSuccess: async () => {
      if (!organization) {
        await queryClient.invalidateQueries({ queryKey: ['customers'] })
        return
      }
      await queryClient.invalidateQueries({
        queryKey: ['customers', organization.id],
      })
    },
  })
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()

  return useMutation({
    mutationFn: async (input: CustomerWriteInput) => updateCustomer(customerId, input),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (organization) {
        await queryClient.invalidateQueries({
          queryKey: customerQueryKey(organization.id, customer.id),
        })
      }
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()

  return useMutation({
    mutationFn: async (customerId: string) => {
      await deleteCustomer(customerId)
    },
    onSuccess: async (_result, customerId) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (organization) {
        await queryClient.removeQueries({
          queryKey: customerQueryKey(organization.id, customerId),
        })
      }
    },
  })
}
