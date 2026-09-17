import { useEffect, useState } from 'react'
import {
  loadIdentity,
  type AuthUser,
  type ReferrerUser,
} from '../lib/auth'
import { setActiveSalon } from '../lib/salonSession'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useAuth(): {
  user: AuthUser | null
  referrer: ReferrerUser | null
  ready: boolean
} {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [referrer, setReferrer] = useState<ReferrerUser | null>(null)
  const [ready, setReady] = useState(!supabaseConfigured)

  useEffect(() => {
    let alive = true
    if (!supabaseConfigured) return

    function apply(identity: Awaited<ReturnType<typeof loadIdentity>>) {
      if (!alive) return
      if (identity?.type === 'salon') {
        setUser(identity.user)
        setReferrer(null)
      } else if (identity?.type === 'referrer') {
        setUser(null)
        setReferrer(identity.referrer)
      } else {
        setUser(null)
        setReferrer(null)
      }
      setReady(true)
    }

    void loadIdentity()
      .then(apply)
      .catch(() => {
        if (!alive) return
        setUser(null)
        setReferrer(null)
        setReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setActiveSalon(null)
        if (alive) {
          setUser(null)
          setReferrer(null)
        }
        return
      }
      void loadIdentity().then(apply)
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  return { user, referrer, ready }
}
