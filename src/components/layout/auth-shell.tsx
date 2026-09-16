import { Link, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/brand-mark'
import { PreferencesToggles } from '@/components/preferences-toggles'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/i18n/use-locale'

export function AuthShell() {
  const { t } = useLocale()

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.12),_transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="animate-fade-in-up relative z-10 w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <PreferencesToggles compact />
        </div>
        <div className="mb-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          >
            <BrandMark className="h-9 w-9 rounded-lg shadow-sm" />
            <span className="text-2xl font-semibold tracking-tight">Operafy</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        <Card className="shadow-md">
          <CardContent className="p-6 sm:p-7">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
