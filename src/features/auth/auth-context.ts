import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AuthCredentials, SignUpInput } from '@/features/auth/auth-service'

export type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  signIn: (input: AuthCredentials) => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
