import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'

type OnboardingValues = {
  name: string
  phone?: string
  email?: string
  address?: string
  defaultCurrency: string
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const createOrganization = useCreateOrganization()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)

  const onboardingSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('onboarding.nameRequired')),
        phone: z.string().trim().optional(),
        email: z.union([z.literal(''), z.email(t('common.validEmail'))]).optional(),
        address: z.string().trim().optional(),
        defaultCurrency: z
          .string()
          .trim()
          .length(3, t('onboarding.currencyLength'))
          .transform((value) => value.toUpperCase()),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      defaultCurrency: 'USD',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await createOrganization.mutateAsync({
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        defaultCurrency: values.defaultCurrency,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error(error)
      setFormError(getErrorMessage(error, t('onboarding.createError')))
    }
  })

  return (
    <div className="mx-auto flex min-h-svh max-w-xl items-center px-4 py-10">
      <Card className="animate-fade-in-up w-full shadow-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <BrandMark className="h-8 w-8 rounded-lg shadow-sm" />
            <span className="text-sm font-medium text-muted-foreground">Operafy</span>
          </div>
          <CardTitle>{t('onboarding.title')}</CardTitle>
          <CardDescription>{t('onboarding.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">{t('onboarding.businessName')}</Label>
              <Input id="name" {...register('name')} />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('onboarding.phone')}</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('onboarding.businessEmail')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email ? (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('onboarding.address')}</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">{t('onboarding.currency')}</Label>
              <Input id="defaultCurrency" maxLength={3} {...register('defaultCurrency')} />
              {errors.defaultCurrency ? (
                <p className="text-sm text-destructive">{errors.defaultCurrency.message}</p>
              ) : null}
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || createOrganization.isPending}
            >
              {isSubmitting || createOrganization.isPending
                ? t('onboarding.creating')
                : t('onboarding.continue')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
