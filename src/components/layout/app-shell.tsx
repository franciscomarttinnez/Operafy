import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
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
import { useLocale } from '@/i18n/use-locale'
import type { MessageKey } from '@/i18n/types'
import { cn } from '@/lib/utils'

const navItems: Array<{ to: string; labelKey: MessageKey; icon: typeof LayoutDashboard }> = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'nav.customers', icon: Users },
  { to: '/quotes', labelKey: 'nav.quotes', icon: ClipboardList },
  { to: '/work-orders', labelKey: 'nav.workOrders', icon: Wrench },
  { to: '/payments', labelKey: 'nav.payments', icon: Receipt },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

const bottomNavItems: Array<{
  to: string
  labelKey: MessageKey
  icon: typeof LayoutDashboard
}> = [
  { to: '/dashboard', labelKey: 'nav.tab.dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'nav.tab.customers', icon: Users },
  { to: '/quotes', labelKey: 'nav.tab.quotes', icon: ClipboardList },
  { to: '/work-orders', labelKey: 'nav.tab.workOrders', icon: Wrench },
  { to: '/payments', labelKey: 'nav.tab.payments', icon: Receipt },
]

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell() {
  const { signOut, user } = useAuth()
  const { organization } = useOrganization()
  const { t } = useLocale()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const businessName = organization?.name ?? t('nav.yourBusiness')

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
          'fixed inset-y-0 left-0 z-50 flex w-[min(16.5rem,88vw)] flex-col border-r border-border bg-card px-3 py-4 shadow-lg transition-transform duration-300 ease-out md:w-[16.5rem] md:translate-x-0 md:shadow-sm',
          'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-2 px-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-10 w-10 shrink-0 rounded-xl shadow-sm" />
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                Operafy
              </p>
            </div>
            <p className="mt-2.5 truncate px-0.5 text-sm font-medium text-muted-foreground">
              {businessName}
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
                  'group flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
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
        <header
          className={cn(
            'sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md md:px-6',
            'pt-[max(0.75rem,env(safe-area-inset-top))] pb-3',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate text-sm font-semibold text-foreground">{businessName}</p>
            <p className="truncate text-xs text-muted-foreground">Operafy</p>
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-sm font-semibold text-foreground">{t('nav.workspace')}</p>
            <p className="truncate text-xs text-muted-foreground">{t('nav.workspaceHint')}</p>
          </div>
          <div className="md:hidden">
            <PreferencesToggles compact />
          </div>
        </header>

        <main className="animate-fade-in-up flex-1 p-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <nav
          aria-label={t('nav.bottom')}
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md md:hidden',
            'pb-[env(safe-area-inset-bottom)]',
          )}
        >
          <div className="grid grid-cols-5">
            {bottomNavItems.map((item) => {
              const active = isNavActive(location.pathname, item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <item.icon className={cn('h-5 w-5', active && 'scale-105')} />
                  <span className="truncate max-w-full">{t(item.labelKey)}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
