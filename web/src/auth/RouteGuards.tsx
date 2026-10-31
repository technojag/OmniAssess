import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './context'

function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center text-text" role="status">
      {t('auth.loading')}
    </div>
  )
}

// Only for logged-in users. Users who have not finished onboarding go to /onboarding first.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!user.hasCompletedOnboarding && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

// Only for admins. Everyone else goes back to the dashboard (the server blocks them as well).
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Login and signup pages: logged-in users do not need them
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}