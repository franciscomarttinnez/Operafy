import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof envSchema>

export function getPublicEnv(): PublicEnv {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  })

  if (!parsed.success) {
    throw new Error(
      'Missing Supabase env vars. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  return {
    ...parsed.data,
    VITE_SUPABASE_URL: normalizeSupabaseUrl(parsed.data.VITE_SUPABASE_URL),
  }
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
}

export function hasPublicEnv(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}
