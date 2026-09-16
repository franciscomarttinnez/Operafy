import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import {
  createOrganization,
  getOrganization,
  getProfile,
  updateOrganization,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from '@/features/organizations/organization-service'
import type { Organization, Profile } from '@/types/database'

export const profileQueryKey = (userId: string) => ['profile', userId] as const
export const organizationQueryKey = (organizationId: string) =>
  ['organization', organizationId] as const

export function useProfile() {
  const { user, isConfigured } = useAuth()

  return useQuery<Profile | null>({
    queryKey: profileQueryKey(user?.id ?? 'anonymous'),
    queryFn: async () => {
      if (!user) {
        return null
      }
      return getProfile(user.id)
    },
    enabled: isConfigured && Boolean(user),
  })
}

export function useOrganization() {
  const profileQuery = useProfile()
  const organizationId = profileQuery.data?.organization_id ?? null

  const organizationQuery = useQuery<Organization | null>({
    queryKey: organizationQueryKey(organizationId ?? 'none'),
    queryFn: async () => {
      if (!organizationId) {
        return null
      }
      return getOrganization(organizationId)
    },
    enabled: Boolean(organizationId),
  })

  return {
    profileQuery,
    organizationQuery,
    organization: organizationQuery.data ?? null,
    hasOrganization: Boolean(organizationId),
    isLoading: profileQuery.isLoading || (Boolean(organizationId) && organizationQuery.isLoading),
    isError: profileQuery.isError || organizationQuery.isError,
    error: profileQuery.error ?? organizationQuery.error,
  }
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => createOrganization(input),
    onSuccess: async (organization) => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) })
      }
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKey(organization.id),
      })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()

  return useMutation({
    mutationFn: async (input: UpdateOrganizationInput) => {
      if (!organization?.id) {
        throw new Error('Organization not found.')
      }
      return updateOrganization(organization.id, input)
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKey(updated.id),
      })
    },
  })
}
