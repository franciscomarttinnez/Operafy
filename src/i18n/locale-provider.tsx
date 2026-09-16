import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocaleContext, type LocaleContextValue } from '@/i18n/locale-context'
import { en } from '@/i18n/messages/en'
import { es } from '@/i18n/messages/es'
import type { Locale, Messages } from '@/i18n/types'

const STORAGE_KEY = 'operafy.locale'

const catalogs: Record<Locale, Messages> = { en, es }

function readStoredLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'es' ? 'es' : 'en'
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) {
    return template
  }
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  )
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => {
        const template = catalogs[locale][key] ?? catalogs.en[key] ?? key
        return interpolate(template, params)
      },
    }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
