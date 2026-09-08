import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { paths } from '../lib/routes'
import type { ReactNode } from 'react'
import { ScreenWait } from './ScreenWait'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <ScreenWait label="Loading…" />
  if (!user) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  }
  return children
}

export function RequireEntitlement({ children }: { children: ReactNode }) {
  const { entitled, ready } = useSubscription()

  if (!ready) return <ScreenWait label="Checking access…" />
  if (!entitled) return <Navigate to={paths.subscribe} replace />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()

  if (!ready) return <ScreenWait label="Loading…" />
  if (user) return <Navigate to={paths.dashboard} replace />
  return children
}
