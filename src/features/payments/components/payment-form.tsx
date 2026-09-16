import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PAYMENT_METHODS } from '@/features/payments/payment-method'
import { paymentMethodLabelKeys } from '@/features/payments/payment-method-i18n'
import {
  createPaymentFormSchema,
  toPaymentWriteInput,
  type PaymentFormValues,
  type PaymentWriteInput,
} from '@/features/payments/payment-schema'
import { useLocale } from '@/i18n/locale-provider'
import { calculatePaymentBalance, formatMoney, fromMinorUnits } from '@/lib/money'
import type { WorkOrderWithCustomer } from '@/types/database'

type PaymentFormProps = {
  workOrders: WorkOrderWithCustomer[]
  paidByWorkOrderId: Record<string, number>
  lockWorkOrderId?: string
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
  submitLabel,
  currencyCode = 'USD',
  onCancel,
  onSubmit,
}: PaymentFormProps) {
  const { t, locale } = useLocale()
  const moneyLocale = locale === 'es' ? 'es' : 'en'
  const locked = Boolean(lockWorkOrderId)
  const schema = useMemo(() => createPaymentFormSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
    null

  const paidMinor = selectedWorkOrder
    ? (paidByWorkOrderId[selectedWorkOrder.id] ?? 0)
    : 0
  const balance = selectedWorkOrder
    ? calculatePaymentBalance(selectedWorkOrder.billable_amount, paidMinor)
    : null

  const submit = handleSubmit(async (values) => {
    const input = toPaymentWriteInput(values)
    if (balance && input.amountMinor > balance.balanceMinor) {
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
          <select
            id="workOrderId"
            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            {...register('workOrderId')}
          >
            <option value="">{t('payments.selectWorkOrder')}</option>
            {workOrders.map((job) => {
              const remaining = calculatePaymentBalance(
                job.billable_amount,
                paidByWorkOrderId[job.id] ?? 0,
              ).balanceMinor
              return (
                <option key={job.id} value={job.id} disabled={remaining <= 0}>
                  {job.title}
                  {job.customers?.name ? ` · ${job.customers.name}` : ''}
                  {` · ${formatMoney(remaining, currencyCode, moneyLocale)}`}
                </option>
              )
            })}
          </select>
        )}
        {errors.workOrderId ? (
          <p className="text-sm text-destructive">{errors.workOrderId.message}</p>
        ) : null}
      </div>

      {balance ? (
        <div className="rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('payments.billable')}</span>
            <span>{formatMoney(balance.billableMinor, currencyCode, moneyLocale)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-muted-foreground">{t('payments.paid')}</span>
            <span>{formatMoney(balance.paidMinor, currencyCode, moneyLocale)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3 font-medium">
            <span>{t('payments.balance')}</span>
            <span>{formatMoney(balance.balanceMinor, currencyCode, moneyLocale)}</span>
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
              balance
                ? String(fromMinorUnits(Math.max(balance.balanceMinor, 0)))
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
          disabled={isSubmitting || (balance !== null && balance.balanceMinor <= 0)}
        >
          {isSubmitting ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  )
}
