import { useEffect, useState } from 'react'
import { loadAuthUser, type AuthUser } from '../lib/auth'
import { setActiveSalon } from '../lib/salonSession'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useAuth(): {
  user: AuthUser | null
  ready: boolean
} {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    if (!supabaseConfigured) {
      setUser(null)
      setReady(true)
      return
    }

    void loadAuthUser()
      .then((next) => {
        if (!alive) return
        setUser(next)
        setReady(true)
      })
      .catch(() => {
        if (!alive) return
        setUser(null)
        setReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setActiveSalon(null)
        if (alive) setUser(null)
        return
      }
      void loadAuthUser().then((next) => {
        if (alive) setUser(next)
      })
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  return { user, ready }
}
