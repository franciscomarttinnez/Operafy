import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutRequest,
  signUp as signUpRequest,
  type AuthCredentials,
  type SignUpInput,
} from '@/features/auth/auth-service'
import { AuthContext } from '@/features/auth/auth-context'
import { hasPublicEnv } from '@/lib/env'

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = hasPublicEnv()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    let active = true

    void getSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load session', error)
        if (active) {
          setSession(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [isConfigured])

  const signIn = useCallback(async (input: AuthCredentials) => {
    await signInWithPassword(input)
  }, [])

  const signUp = useCallback(async (input: SignUpInput) => {
    await signUpRequest(input)
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [session, isLoading, isConfigured, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
