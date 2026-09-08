import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import {
  fetchBillingStatus,
  paywallBypassed,
  type BillingStatus,
} from '../lib/billing'

export function useSubscription(): {
  ready: boolean
  entitled: boolean
  info: BillingStatus | null
  error: string | null
  refresh: () => Promise<boolean>
} {
  const { user, ready: authReady } = useAuth()
  const [ready, setReady] = useState(false)
  const [entitled, setEntitled] = useState(false)
  const [info, setInfo] = useState<BillingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (paywallBypassed()) {
      setEntitled(true)
      setInfo(null)
      setError(null)
      setReady(true)
      return true
    }
    if (!user) {
      setEntitled(false)
      setInfo(null)
      setReady(true)
      return false
    }
    try {
      const status = await fetchBillingStatus()
      setInfo(status)
      setEntitled(status.entitled)
      setError(null)
      setReady(true)
      return status.entitled
    } catch (caught) {
      setEntitled(false)
      setInfo(null)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not check the subscription.',
      )
      setReady(true)
      return false
    }
  }, [user])

  useEffect(() => {
    if (!authReady) return
    void refresh()
  }, [authReady, refresh])

  return {
    ready: authReady && ready,
    entitled,
    info,
    error,
    refresh,
  }
}
