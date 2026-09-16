import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/features/auth/auth-service'
import { useAuth } from '@/features/auth/use-auth'
import { useLocale } from '@/i18n/use-locale'
import { getSupabaseClient } from '@/lib/supabase'
import { hasPublicEnv } from '@/lib/env'

type ResetValues = {
  password: string
  confirmPassword: string
}

export function ResetPasswordPage() {
  const { t } = useLocale()
  const { user, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const envConfigured = hasPublicEnv()
  const [sessionReady, setSessionReady] = useState(!envConfigured)
  const [linkInvalid, setLinkInvalid] = useState(!envConfigured)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetSchema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(6, t('auth.passwordMin')),
          confirmPassword: z.string().min(6, t('auth.passwordMin')),
        })
        .refine((values) => values.password === values.confirmPassword, {
          message: t('auth.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!envConfigured) {
      return
    }

    const supabase = getSupabaseClient()
    let active = true
    let settled = false

    const markReady = (valid: boolean) => {
      if (!active || settled) {
        return
      }
      settled = true
      setSessionReady(true)
      setLinkInvalid(!valid)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady(true)
      }
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        markReady(true)
        return
      }

      window.setTimeout(() => {
        void supabase.auth.getSession().then(({ data: later }) => {
          markReady(Boolean(later.session))
        })
      }, 800)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [envConfigured])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await updatePassword(values.password)
      setSuccess(true)
      await signOut()
      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (error) {
      console.error(error)
      setFormError(error instanceof Error ? error.message : t('auth.updatePasswordError'))
    }
  })

  if (isLoading || !sessionReady) {
    return (
      <div className="animate-fade-in-up space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.resetPasswordTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!envConfigured) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm text-destructive">{t('auth.supabaseNotConfigured')}</p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary hover:underline" to="/login">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    )
  }

  if (linkInvalid || !user) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm text-destructive">{t('auth.resetLinkInvalid')}</p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary hover:underline" to="/forgot-password">
            {t('auth.sendReset')}
          </Link>
          {' · '}
          <Link className="font-medium text-primary hover:underline" to="/login">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.resetPasswordTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.resetPasswordHint')}</p>
      </div>

      {success ? (
        <p className="text-sm text-primary">{t('auth.updatePasswordSuccess')}</p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.newPassword')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('auth.updatingPassword') : t('auth.updatePassword')}
          </Button>
        </form>
      )}
    </div>
  )
}
