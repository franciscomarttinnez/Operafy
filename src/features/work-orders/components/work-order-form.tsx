import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/customer-picker'
import { useCustomer } from '@/features/customers/use-customers'
import {
  createWorkOrderFormSchema,
  toWorkOrderUpdateInput,
  toWorkOrderWriteInput,
  type WorkOrderFormValues,
  type WorkOrderUpdateInput,
  type WorkOrderWriteInput,
} from '@/features/work-orders/work-order-schema'
import { useLocale } from '@/i18n/use-locale'
import { formatMoney, fromMinorUnits } from '@/lib/money'
import type { WorkOrderWithCustomer } from '@/types/database'

type WorkOrderFormProps = {
  initialWorkOrder?: WorkOrderWithCustomer | null
  submitLabel: string
  onCancel: () => void
  currencyCode?: string
  lockCustomerId?: string
  onCreate?: (input: WorkOrderWriteInput) => Promise<void>
  onUpdate?: (input: WorkOrderUpdateInput) => Promise<void>
}

function toFormValues(
  workOrder?: WorkOrderWithCustomer | null,
  lockCustomerId?: string,
): WorkOrderFormValues {
  if (!workOrder) {
    return {
      customerId: lockCustomerId ?? '',
      title: '',
      description: '',
      scheduledDate: '',
      notes: '',
      billableAmount: '0',
    }
  }

  return {
    customerId: workOrder.customer_id,
    title: workOrder.title,
    description: workOrder.description ?? '',
    scheduledDate: workOrder.scheduled_date ?? '',
    notes: workOrder.notes ?? '',
    billableAmount: String(fromMinorUnits(workOrder.billable_amount)),
  }
}

export function WorkOrderForm({
  initialWorkOrder,
  submitLabel,
  onCancel,
  currencyCode = 'USD',
  lockCustomerId,
  onCreate,
  onUpdate,
}: WorkOrderFormProps) {
  const { t } = useLocale()
  const schema = useMemo(() => createWorkOrderFormSchema(t), [t])
  const hasQuote = Boolean(initialWorkOrder?.quote_id)
  const customerLocked = Boolean(lockCustomerId || initialWorkOrder)
  const lockedCustomerQuery = useCustomer(
    customerLocked && !initialWorkOrder ? lockCustomerId : undefined,
  )

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initialWorkOrder, lockCustomerId),
  })

  const submit = handleSubmit(async (values) => {
    if (initialWorkOrder) {
      if (!onUpdate) {
        return
      }
      await onUpdate(toWorkOrderUpdateInput(values, { hasQuote }))
      return
    }
    if (!onCreate) {
      return
    }
    await onCreate(toWorkOrderWriteInput(values))
  })

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="customerId">{t('workOrders.customer')}</Label>
        {customerLocked ? (
          <>
            <input type="hidden" {...register('customerId')} />
            <Input
              id="customerId"
              disabled
              value={
                initialWorkOrder?.customers?.name ??
                lockedCustomerQuery.data?.name ??
                t('common.emDash')
              }
            />
          </>
        ) : (
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <CustomerPicker
                id="customerId"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        )}
        {errors.customerId ? (
          <p className="text-sm text-destructive">{errors.customerId.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">{t('workOrders.titleLabel')}</Label>
        <Input id="title" {...register('title')} placeholder={t('workOrders.titlePlaceholder')} />
        {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('workOrders.description')}</Label>
        <Textarea id="description" {...register('description')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">{t('workOrders.scheduledDate')}</Label>
          <Input id="scheduledDate" type="date" {...register('scheduledDate')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billableAmount">{t('workOrders.billableAmount')}</Label>
          <Input
            id="billableAmount"
            inputMode="decimal"
            disabled={hasQuote}
            {...register('billableAmount')}
          />
          {hasQuote ? (
            <p className="text-xs text-muted-foreground">
              {t('workOrders.billableFromQuote', {
                amount: formatMoney(initialWorkOrder?.billable_amount ?? 0, currencyCode),
              })}
            </p>
          ) : null}
          {errors.billableAmount ? (
            <p className="text-sm text-destructive">{errors.billableAmount.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('workOrders.notes')}</Label>
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
