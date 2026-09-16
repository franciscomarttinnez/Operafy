import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useOrganization,
  useUpdateOrganization,
} from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

type SettingsValues = {
  name: string
  phone: string
  email: string
  address: string
  defaultCurrency: string
}

export function SettingsPage() {
  const { organization, isLoading } = useOrganization()
  const updateOrganization = useUpdateOrganization()
  const queryClient = useQueryClient()
  const { t } = useLocale()
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedBusy, setSeedBusy] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('onboarding.nameRequired')),
        phone: z.string(),
        email: z.union([z.literal(''), z.email(t('common.validEmail'))]),
        address: z.string(),
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
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      defaultCurrency: 'USD',
    },
  })

  useEffect(() => {
    if (!organization) {
      return
    }
    reset({
      name: organization.name,
      phone: organization.phone ?? '',
      email: organization.email ?? '',
      address: organization.address ?? '',
      defaultCurrency: organization.default_currency || 'USD',
    })
  }, [organization, reset])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setSaved(false)
    try {
      await updateOrganization.mutateAsync({
        name: values.name,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        defaultCurrency: values.defaultCurrency,
      })
      setSaved(true)
    } catch (error) {
      console.error(error)
      setFormError(getErrorMessage(error, t('settings.saveError')))
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </CardContent>
      </Card>
    )
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">{t('settings.notFound')}</p>
          <Button asChild variant="outline">
            <Link to="/onboarding">{t('settings.goOnboarding')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.businessTitle')}</CardTitle>
          <CardDescription>{t('settings.businessHint')}</CardDescription>
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
            {saved && !formError ? (
              <p className="text-sm text-success">{t('settings.saved')}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? t('common.saving') : t('settings.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.demoTitle')}</CardTitle>
          <CardDescription>{t('settings.demoHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {seedError ? <p className="text-sm text-destructive">{seedError}</p> : null}
          {seedMessage ? <p className="text-sm text-success">{seedMessage}</p> : null}
          <Button
            type="button"
            variant="outline"
            disabled={seedBusy}
            onClick={() => {
              setSeedError(null)
              setSeedMessage(null)
              setSeedBusy(true)
              void (async () => {
                try {
                  const supabase = getSupabaseClient()
                  const { data, error } = await supabase.rpc('seed_demo_data')
                  if (error) {
                    throw error
                  }
                  setSeedMessage(
                    typeof data === 'string' ? data : t('settings.demoLoaded'),
                  )
                  await queryClient.invalidateQueries()
                } catch (error) {
                  console.error(error)
                  setSeedError(getErrorMessage(error, t('settings.demoError')))
                } finally {
                  setSeedBusy(false)
                }
              })()
            }}
          >
            {seedBusy ? t('settings.demoLoading') : t('settings.demoLoad')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
