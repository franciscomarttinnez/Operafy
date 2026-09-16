import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/searchable-select'
import { PAYMENT_METHODS } from '@/features/payments/payment-method'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import {
  createPaymentFormSchema,
  paymentToFormValues,
  toPaymentWriteInput,
  type PaymentFormValues,
  type PaymentWriteInput,
} from '@/features/payments/payment-schema'
import { useLocale } from '@/i18n/use-locale'
import { calculatePaymentBalance, formatMoney, fromMinorUnits } from '@/lib/money'
import type { Payment, WorkOrderWithCustomer } from '@/types/database'

type PaymentFormProps = {
  workOrders: WorkOrderWithCustomer[]
  paidByWorkOrderId: Record<string, number>
  lockWorkOrderId?: string
  initialPayment?: Payment | null
  submitLabel: string
  currencyCode?: string
  onCancel: () => void
  onSubmit: (input: PaymentWriteInput) => Promise<void>
}

function todayInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PaymentForm({
  workOrders,
  paidByWorkOrderId,
  lockWorkOrderId,
  initialPayment,
  submitLabel,
  currencyCode = 'USD',
  onCancel,
  onSubmit,
}: PaymentFormProps) {
  const { t, locale } = useLocale()
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const locked = Boolean(lockWorkOrderId || initialPayment)
  const schema = useMemo(() => createPaymentFormSchema(t), [t])
  const editingAmountMinor = initialPayment?.amount ?? 0

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialPayment
      ? paymentToFormValues(initialPayment)
      : {
          workOrderId: lockWorkOrderId ?? '',
          amount: '',
          method: 'cash',
          paidAt: todayInputValue(),
          notes: '',
        },
  })

  const selectedWorkOrderId = useWatch({ control, name: 'workOrderId' })
  const selectedWorkOrder =
    workOrders.find((job) => job.id === selectedWorkOrderId) ??
    workOrders.find((job) => job.id === lockWorkOrderId) ??
    workOrders.find((job) => job.id === initialPayment?.work_order_id) ??
    null

  const paidMinorRaw = selectedWorkOrder
    ? (paidByWorkOrderId[selectedWorkOrder.id] ?? 0)
    : 0
  const otherPaidMinor = Math.max(paidMinorRaw - editingAmountMinor, 0)
  const available = selectedWorkOrder
    ? calculatePaymentBalance(selectedWorkOrder.billable_amount, otherPaidMinor)
    : null

  const workOrderOptions = useMemo(
    () =>
      workOrders.map((job) => {
        const remaining = calculatePaymentBalance(
          job.billable_amount,
          paidByWorkOrderId[job.id] ?? 0,
        ).balanceMinor
        return {
          value: job.id,
          label: job.title,
          description: [
            job.customers?.name,
            formatMoney(remaining, currencyCode, moneyLocale),
            job.quotes?.quote_number,
          ]
            .filter(Boolean)
            .join(' · '),
          keywords: [job.customers?.name, job.quotes?.quote_number].filter(Boolean).join(' '),
        }
      }),
    [workOrders, paidByWorkOrderId, currencyCode, moneyLocale],
  )

  const submit = handleSubmit(async (values) => {
    const input = toPaymentWriteInput(values)
    if (available && input.amountMinor > available.balanceMinor) {
      setError('amount', {
        type: 'custom',
        message: t('payments.amountExceedsBalance'),
      })
      return
    }
    await onSubmit(input)
  })

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="workOrderId">{t('payments.workOrder')}</Label>
        {locked ? (
          <>
            <input type="hidden" {...register('workOrderId')} />
            <Input
              id="workOrderId"
              disabled
              value={selectedWorkOrder?.title ?? t('common.emDash')}
            />
          </>
        ) : (
          <Controller
            name="workOrderId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="workOrderId"
                value={field.value}
                onChange={field.onChange}
                options={workOrderOptions}
                placeholder={t('forms.selectWorkOrder')}
                searchPlaceholder={t('forms.searchWorkOrder')}
                emptyLabel={t('forms.noWorkOrderMatch')}
                recentHint={t('forms.recentWorkOrders')}
              />
            )}
          />
        )}
        {errors.workOrderId ? (
          <p className="text-sm text-destructive">{errors.workOrderId.message}</p>
        ) : null}
      </div>

      {available ? (
        <div className="rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('payments.billable')}</span>
            <span>{formatMoney(available.billableMinor, currencyCode, moneyLocale)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-muted-foreground">{t('payments.otherPaid')}</span>
            <span>{formatMoney(available.paidMinor, currencyCode, moneyLocale)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3 font-medium">
            <span>{t('payments.availableForThis')}</span>
            <span>{formatMoney(available.balanceMinor, currencyCode, moneyLocale)}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">{t('payments.amount')}</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder={
              available
                ? String(fromMinorUnits(Math.max(available.balanceMinor, 0)))
                : undefined
            }
            {...register('amount')}
          />
          {errors.amount ? (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">{t('payments.methodLabel')}</Label>
          <select
            id="method"
            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            {...register('method')}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(paymentMethodLabelKeys[method])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paidAt">{t('payments.paidAt')}</Label>
        <Input id="paidAt" type="date" {...register('paidAt')} />
        {errors.paidAt ? (
          <p className="text-sm text-destructive">{errors.paidAt.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('payments.notes')}</Label>
        <Textarea id="notes" {...register('notes')} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={
            isSubmitting ||
            (available !== null && available.balanceMinor <= 0 && !initialPayment)
          }
        >
          {isSubmitting ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  )
}
