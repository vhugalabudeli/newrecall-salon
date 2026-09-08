import { useEffect, useState } from 'react'
import {
  AUTH_CHANGED,
  readSessionUser,
  type AuthUser,
} from '../lib/auth'

export function useAuth(): {
  user: AuthUser | null
  ready: boolean
} {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(readSessionUser())
    setReady(true)
    function onChange() {
      setUser(readSessionUser())
    }
    window.addEventListener(AUTH_CHANGED, onChange)
    return () => window.removeEventListener(AUTH_CHANGED, onChange)
  }, [])

  return { user, ready }
}
