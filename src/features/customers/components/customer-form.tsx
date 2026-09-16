import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createCustomerFormSchema,
  type CustomerFormValues,
  type CustomerWriteInput,
} from '@/features/customers/customer-schema'
import { useLocale } from '@/i18n/use-locale'
import type { Customer } from '@/types/database'

type CustomerFormProps = {
  initialCustomer?: Customer | null
  submitLabel: string
  onSubmit: (input: CustomerWriteInput) => Promise<void>
  onCancel: () => void
}

export function CustomerForm({
  initialCustomer,
  submitLabel,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const { t } = useLocale()
  const schema = useMemo(() => createCustomerFormSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialCustomer?.name ?? '',
      phone: initialCustomer?.phone ?? '',
      email: initialCustomer?.email ?? '',
      address: initialCustomer?.address ?? '',
      notes: initialCustomer?.notes ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
    })
  })

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">{t('customers.name')}</Label>
        <Input id="name" autoComplete="name" {...register('name')} />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('customers.phone')}</Label>
          <Input id="phone" autoComplete="tel" {...register('phone')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('customers.email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('customers.address')}</Label>
        <Input id="address" autoComplete="street-address" {...register('address')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('customers.notes')}</Label>
        <Textarea id="notes" {...register('notes')} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  )
}
