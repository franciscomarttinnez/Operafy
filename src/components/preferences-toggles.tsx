import { Languages, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/i18n/use-locale'
import { useTheme } from '@/theme/use-theme'
import { cn } from '@/lib/utils'

type PreferencesTogglesProps = {
  className?: string
  compact?: boolean
}

export function PreferencesToggles({ className, compact = false }: PreferencesTogglesProps) {
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const languageLabel = locale === 'en' ? 'EN' : 'ES'
  const themeLabel = theme === 'light' ? t('common.light') : t('common.dark')

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
        aria-label={`${t('common.language')}: ${languageLabel}`}
        title={`${t('common.language')}: ${languageLabel}`}
      >
        <Languages className="h-4 w-4" />
        {compact ? null : <span>{languageLabel}</span>}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={toggleTheme}
        aria-label={`${t('common.theme')}: ${themeLabel}`}
        title={`${t('common.theme')}: ${themeLabel}`}
      >
        {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {compact ? null : <span>{themeLabel}</span>}
      </Button>
    </div>
  )
}
