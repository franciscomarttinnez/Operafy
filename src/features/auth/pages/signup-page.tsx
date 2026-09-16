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

type SignUpValues = {
  fullName: string
  email: string
  password: string
}

export function SignUpPage() {
  const { signUp } = useAuth()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const signUpSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, t('auth.nameMin')),
        email: z.email(t('common.validEmail')),
        password: z.string().min(6, t('auth.passwordMin')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setInfoMessage(null)
    try {
      await signUp(values)
      setInfoMessage(t('auth.signUpSuccess'))
    } catch (error) {
      console.error(error)
      setFormError(error instanceof Error ? error.message : t('auth.signUpError'))
    }
  })

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.signUpTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.signUpHint')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('auth.fullName')}</Label>
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
          {errors.fullName ? (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          ) : null}
        </div>

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
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        {infoMessage ? <p className="text-sm text-primary">{infoMessage}</p> : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link className="font-medium text-primary hover:underline" to="/login">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
