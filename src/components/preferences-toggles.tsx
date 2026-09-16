import { Languages, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/i18n/locale-provider'
import { useTheme } from '@/theme/theme-provider'
import { cn } from '@/lib/utils'

type PreferencesTogglesProps = {
  className?: string
  compact?: boolean
}

export function PreferencesToggles({ className, compact = false }: PreferencesTogglesProps) {
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
        aria-label={t('common.language')}
        title={`${t('common.language')}: ${locale === 'en' ? 'ES' : 'EN'}`}
      >
        <Languages className="h-4 w-4" />
        {compact ? null : <span>{locale === 'en' ? 'ES' : 'EN'}</span>}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={toggleTheme}
        aria-label={t('common.theme')}
        title={`${t('common.theme')}: ${theme === 'light' ? t('common.dark') : t('common.light')}`}
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {compact ? null : <span>{theme === 'light' ? t('common.dark') : t('common.light')}</span>}
      </Button>
    </div>
  )
}
