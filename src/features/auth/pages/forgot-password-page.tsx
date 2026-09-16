import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/features/auth/auth-service'
import { useLocale } from '@/i18n/locale-provider'
import { hasPublicEnv } from '@/lib/env'

type ForgotValues = {
  email: string
}

export function ForgotPasswordPage() {
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const forgotSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('common.validEmail')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setInfoMessage(null)

    if (!hasPublicEnv()) {
      setFormError(t('auth.supabaseNotConfigured'))
      return
    }

    try {
      await requestPasswordReset(values.email)
      setInfoMessage(t('auth.resetSent'))
    } catch (error) {
      console.error(error)
      setFormError(error instanceof Error ? error.message : t('auth.resetError'))
    }
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.forgotTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.forgotHint')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        {infoMessage ? <p className="text-sm text-primary">{infoMessage}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('auth.sending') : t('auth.sendReset')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link className="font-medium text-primary hover:underline" to="/login">
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </div>
  )
}
