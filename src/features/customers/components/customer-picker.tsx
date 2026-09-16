import { useMemo, useState } from 'react'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/searchable-select'
import { useCustomers } from '@/features/customers/use-customers'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocale } from '@/i18n/use-locale'
import type { Customer } from '@/types/database'

type CustomerPickerProps = {
  id?: string
  value: string
  onChange: (customerId: string) => void
  disabled?: boolean
  selectedCustomer?: Pick<Customer, 'id' | 'name' | 'email' | 'phone'> | null
}

export function CustomerPicker({
  id,
  value,
  onChange,
  disabled,
  selectedCustomer,
}: CustomerPickerProps) {
  const { t } = useLocale()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 250)
  const customersQuery = useCustomers(search)

  const options = useMemo(() => {
    const map = new Map<string, SearchableSelectOption>()

    if (selectedCustomer) {
      map.set(selectedCustomer.id, {
        value: selectedCustomer.id,
        label: selectedCustomer.name,
        description:
          selectedCustomer.phone || selectedCustomer.email || undefined,
        keywords: [selectedCustomer.phone, selectedCustomer.email]
          .filter(Boolean)
          .join(' '),
      })
    }

    for (const customer of customersQuery.data ?? []) {
      map.set(customer.id, {
        value: customer.id,
        label: customer.name,
        description: customer.phone || customer.email || undefined,
        keywords: [customer.phone, customer.email].filter(Boolean).join(' '),
      })
    }

    return Array.from(map.values())
  }, [customersQuery.data, selectedCustomer])

  return (
    <SearchableSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={customersQuery.isLoading}
      placeholder={t('forms.selectCustomer')}
      searchPlaceholder={t('forms.searchCustomer')}
      emptyLabel={t('forms.noCustomerMatch')}
      recentHint={searchInput.trim() ? undefined : t('forms.recentCustomers')}
      onSearchChange={setSearchInput}
    />
  )
}
