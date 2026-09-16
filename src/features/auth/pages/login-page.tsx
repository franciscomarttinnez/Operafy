import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/use-auth'
import { useLocale } from '@/i18n/use-locale'

type LoginValues = {
  email: string
  password: string
}

export function LoginPage() {
  const { signIn } = useAuth()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('common.validEmail')),
        password: z.string().min(6, t('auth.passwordMin')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signIn(values)
    } catch (error) {
      console.error(error)
      setFormError(error instanceof Error ? error.message : t('auth.signInError'))
    }
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.signInTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInHint')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>
          <Link
            className="font-medium text-primary transition-colors hover:text-blue-700 hover:underline dark:hover:text-blue-300"
            to="/forgot-password"
          >
            {t('auth.forgotPassword')}
          </Link>
        </p>
        <p>
          {t('auth.needAccount')}{' '}
          <Link
            className="font-medium text-primary transition-colors hover:text-blue-700 hover:underline dark:hover:text-blue-300"
            to="/signup"
          >
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  )
}
