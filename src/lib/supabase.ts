import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPublicEnv, hasPublicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!hasPublicEnv()) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
    )
  }

  if (!client) {
    const env = getPublicEnv()
    client = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}
