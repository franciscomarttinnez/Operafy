import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type FilterChipOption<T extends string> = {
  value: T
  label: string
}

type FilterChipsProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Array<FilterChipOption<T>>
  label: string
  className?: string
  children?: ReactNode
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  children,
}: FilterChipsProps<T>) {
  return (
    <div
      className={cn(
        'scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        className,
      )}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 touch-manipulation rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        )
      })}
      {children}
    </div>
  )
}

type ListFiltersProps<T extends string> = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  searchLabel: string
  filterValue: T
  onFilterChange: (value: T) => void
  filterOptions: Array<FilterChipOption<T>>
  filterLabel?: string
  className?: string
  children?: ReactNode
}

export function ListFilters<T extends string>({
  search,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel,
  className,
  children,
}: ListFiltersProps<T>) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 pl-9"
          aria-label={searchLabel}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <FilterChips
        value={filterValue}
        onChange={onFilterChange}
        options={filterOptions}
        label={filterLabel ?? searchLabel}
      >
        {children}
      </FilterChips>
    </div>
  )
}
