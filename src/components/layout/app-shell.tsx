import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { PreferencesToggles } from '@/components/preferences-toggles'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'
import type { MessageKey } from '@/i18n/types'
import { cn } from '@/lib/utils'

const navItems: Array<{ to: string; labelKey: MessageKey; icon: typeof LayoutDashboard }> = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'nav.customers', icon: Users },
  { to: '/quotes', labelKey: 'nav.quotes', icon: ClipboardList },
  { to: '/work-orders', labelKey: 'nav.workOrders', icon: Wrench },
  { to: '/payments', labelKey: 'nav.payments', icon: Receipt },
]

export function AppShell() {
  const { signOut, user } = useAuth()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', mobileOpen)
    return () => {
      document.body.classList.remove('sidebar-open')
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  return (
    <div className="min-h-svh bg-background">
      <button
        type="button"
        aria-label={t('nav.closeMenu')}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[16.5rem] flex-col border-r border-border bg-card px-3 py-4 shadow-sm transition-transform duration-300 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-2 px-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BrandMark className="h-8 w-8 shrink-0 rounded-lg shadow-sm" />
              <p className="truncate text-base font-semibold tracking-tight text-foreground">
                Operafy
              </p>
            </div>
            <p className="mt-2 truncate px-0.5 text-xs text-muted-foreground">
              {organization?.name ?? t('nav.yourBusiness')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.closeMenu')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label={t('nav.main')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-primary shadow-sm',
                )
              }
            >
              <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <PreferencesToggles className="px-1" />
          <p className="truncate px-2 text-xs text-muted-foreground" title={user?.email}>
            {user?.email}
          </p>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              void signOut()
            }}
          >
            <LogOut className="h-4 w-4" />
            {t('nav.signOut')}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-col md:pl-[16.5rem]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{t('nav.workspace')}</p>
            <p className="truncate text-xs text-muted-foreground">{t('nav.workspaceHint')}</p>
          </div>
        </header>

        <main className="animate-fade-in-up flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
