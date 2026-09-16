import { ChevronsUpDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/i18n/use-locale'
import { matchesSearchQuery } from '@/lib/search'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  value: string
  label: string
  description?: string
  keywords?: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  recentHint?: string
  disabled?: boolean
  loading?: boolean
  onSearchChange?: (query: string) => void
  className?: string
}

const RECENT_LIMIT = 8

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  recentHint,
  disabled = false,
  loading = false,
  onSearchChange,
  className,
}: SearchableSelectProps) {
  const { t } = useLocale()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((option) => option.value === value) ?? null

  const visibleOptions = useMemo(() => {
    if (onSearchChange) {
      return options.slice(0, query.trim() ? options.length : RECENT_LIMIT)
    }
    if (!query.trim()) {
      return options.slice(0, RECENT_LIMIT)
    }
    return options.filter((option) =>
      matchesSearchQuery(query, option.label, option.description, option.keywords),
    )
  }, [onSearchChange, options, query])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
        onSearchChange?.('')
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
        onSearchChange?.('')
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onSearchChange])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm shadow-sm transition-colors',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={() => {
          if (disabled) {
            return
          }
          setOpen((current) => !current)
        }}
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                const next = event.target.value
                setQuery(next)
                onSearchChange?.(next)
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchPlaceholder}
            />
          </div>
          {!query.trim() && recentHint ? (
            <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">{recentHint}</p>
          ) : null}
          <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading')}</li>
            ) : null}
            {!loading && visibleOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</li>
            ) : null}
            {!loading
              ? visibleOptions.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                          'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                          isSelected && 'bg-accent',
                        )}
                        onClick={() => {
                          onChange(option.value)
                          setOpen(false)
                          setQuery('')
                          onSearchChange?.('')
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                        {option.description ? (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
