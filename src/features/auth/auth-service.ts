import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

export type AuthCredentials = {
  email: string
  password: string
}

export type SignUpInput = AuthCredentials & {
  fullName: string
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

export async function signInWithPassword(input: AuthCredentials): Promise<User> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Sign in failed.')
  }

  return data.user
}

export async function signUp(input: SignUpInput): Promise<User> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Sign up failed.')
  }

  return data.user
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient()
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    throw error
  }
}

export async function updatePassword(password: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    throw error
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const supabase = getSupabaseClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => {
    subscription.unsubscribe()
  }
}
