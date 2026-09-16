import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCustomers } from '@/features/customers/use-customers'
import { useLocale } from '@/i18n/locale-provider'

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debounced
}

export function CustomersListPage() {
  const { t } = useLocale()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const customersQuery = useCustomers(search)

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
          className="pl-9"
          aria-label={t('customers.search')}
        />
      </div>

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
              <Link key={customer.id} to={`/customers/${customer.id}`} className="block">
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-1 p-4">
                    <p className="font-medium text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone || customer.email || t('customers.noContact')}
                    </p>
                    {customer.address ? (
                      <p className="truncate text-xs text-muted-foreground">{customer.address}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('customers.name')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.phone')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.email')}</th>
                    <th className="px-4 py-3 font-medium">{t('customers.address')}</th>
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
        </>
      ) : null}
    </div>
  )
}
