import { Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCustomers, useDeleteCustomer } from '@/features/customers/use-customers'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocale } from '@/i18n/use-locale'
import { getErrorMessage } from '@/lib/errors'

export function CustomersListPage() {
  const { t } = useLocale()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const customersQuery = useCustomers(search)
  const deleteCustomer = useDeleteCustomer()
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const mapDeleteError = (error: unknown) => {
    const message = getErrorMessage(error, t('customers.deleteError'))
    const lower = message.toLowerCase()
    if (lower.includes('quote')) {
      return t('customers.deleteBlockedQuotes')
    }
    if (lower.includes('work order') || lower.includes('job')) {
      return t('customers.deleteBlockedJobs')
    }
    if (lower.includes('payment')) {
      return t('customers.deleteBlockedPayments')
    }
    return message
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('customers.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('customers.subtitle')}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/customers/new">
            <Plus className="h-4 w-4" />
            {t('customers.add')}
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('customers.search')}
          className="h-11 pl-9"
          aria-label={t('customers.search')}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {customersQuery.isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('customers.loading')}
          </CardContent>
        </Card>
      ) : null}

      {customersQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {customersQuery.error instanceof Error
              ? customersQuery.error.message
              : t('customers.loadError')}
          </CardContent>
        </Card>
      ) : null}

      {customersQuery.isSuccess && customersQuery.data.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium text-foreground">
              {search ? t('customers.noMatch') : t('customers.empty')}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? t('customers.noMatchHint') : t('customers.emptyHint')}
            </p>
            {!search ? (
              <Button asChild>
                <Link to="/customers/new">{t('customers.add')}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {customersQuery.isSuccess && customersQuery.data.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {customersQuery.data.map((customer) => (
              <Card
                key={customer.id}
                className="transition-colors active:bg-accent/50 md:transition-all md:hover:-translate-y-0.5 md:hover:shadow-md"
              >
                <CardContent className="space-y-3 p-4">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="touch-card block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-medium text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone || customer.email || t('customers.noContact')}
                    </p>
                    {customer.address ? (
                      <p className="truncate text-xs text-muted-foreground">{customer.address}</p>
                    ) : null}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteCustomer.isPending}
                    onClick={() => {
                      setActionError(null)
                      setPendingDelete({ id: customer.id, name: customer.name })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('customers.name')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.phone')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.email')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.address')}</th>
                    <th className="px-4 py-3 font-medium">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customersQuery.data.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.phone ?? t('common.emDash')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.email ?? t('common.emDash')}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                        {customer.address ?? t('common.emDash')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteCustomer.isPending}
                          onClick={() => {
                            setActionError(null)
                            setPendingDelete({ id: customer.id, name: customer.name })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">
            {t('customers.showingUpTo', {
              suffix: search ? t('customers.matchingSearch') : '',
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t('customers.deleteHint')}</p>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.delete')}
        description={t('customers.deleteConfirm', { name: pendingDelete?.name ?? '' })}
        confirmLabel={deleteCustomer.isPending ? t('common.deleting') : t('common.delete')}
        destructive
        busy={deleteCustomer.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return
          }
          const target = pendingDelete
          setActionError(null)
          void deleteCustomer
            .mutateAsync(target.id)
            .then(() => setPendingDelete(null))
            .catch((error: unknown) => {
              console.error(error)
              setPendingDelete(null)
              setActionError(mapDeleteError(error))
            })
        }}
      />
    </div>
  )
}
