import { getSupabaseClient } from '@/lib/supabase'
import type { Organization, Profile } from '@/types/database'

export type CreateOrganizationInput = {
  name: string
  phone?: string
  email?: string
  address?: string
  defaultCurrency?: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getOrganization(
  organizationId: string,
): Promise<Organization | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_organization_for_owner', {
    p_name: input.name,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_default_currency: input.defaultCurrency ?? 'USD',
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not create organization.')
  }

  return data
}
