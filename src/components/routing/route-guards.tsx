import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { useOrganization } from '@/features/organizations/use-organization'
import { useLocale } from '@/i18n/locale-provider'

function FullPageMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="animate-fade-in-up max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const location = useLocation()
  const { t } = useLocale()
  const { user, isLoading: authLoading, isConfigured } = useAuth()
  const { hasOrganization, isLoading: orgLoading, isError, error } = useOrganization()

  if (!isConfigured) {
    return (
      <FullPageMessage
        title={t('session.supabaseMissingTitle')}
        detail={t('session.supabaseMissingBody')}
      />
    )
  }

  if (authLoading) {
    return (
      <FullPageMessage title={t('session.loadingTitle')} detail={t('session.loadingBody')} />
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (orgLoading) {
    return (
      <FullPageMessage
        title={t('session.workspaceLoadingTitle')}
        detail={t('session.workspaceLoadingBody')}
      />
    )
  }

  if (isError) {
    return (
      <FullPageMessage
        title={t('session.workspaceErrorTitle')}
        detail={error instanceof Error ? error.message : t('session.workspaceErrorBody')}
      />
    )
  }

  if (!hasOrganization && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (hasOrganization && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { t } = useLocale()
  const { user, isLoading, isConfigured } = useAuth()
  const { hasOrganization, isLoading: orgLoading } = useOrganization()

  if (!isConfigured) {
    return <Outlet />
  }

  if (isLoading || (user && orgLoading)) {
    return (
      <FullPageMessage
        title={t('session.loadingShortTitle')}
        detail={t('session.loadingShortBody')}
      />
    )
  }

  if (user) {
    return <Navigate to={hasOrganization ? '/dashboard' : '/onboarding'} replace />
  }

  return <Outlet />
}
