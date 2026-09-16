import { useContext } from 'react'
import { LocaleContext, type LocaleContextValue } from '@/i18n/locale-context'

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
