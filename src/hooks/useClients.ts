import { useCallback, useEffect, useState } from 'react'
import { listClients } from '../lib/db'
import { getActiveSalon } from '../lib/salonSession'
import { sortByRecall } from '../lib/schedule'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Client } from '../types'

export function useClients(): {
  clients: Client[]
  ready: boolean
} {
  const { user } = useAuth()
  const salonId = user?.salonId ?? getActiveSalon()?.salonId ?? null
  const [clients, setClients] = useState<Client[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!salonId) {
      setClients([])
      setReady(true)
      return
    }
    try {
      const rows = await listClients()
      setClients(sortByRecall(rows))
    } catch {
      setClients([])
    } finally {
      setReady(true)
    }
  }, [salonId])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0)
    if (!salonId) {
      return () => window.clearTimeout(initialTimer)
    }
    let timer: number | undefined
    const queue = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void refresh()
      }, 200)
    }
    const channel = supabase
      .channel(`book:${salonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `salon_id=eq.${salonId}`,
        },
        queue,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `salon_id=eq.${salonId}`,
        },
        queue,
      )
      .subscribe()
    return () => {
      window.clearTimeout(initialTimer)
      window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [refresh, salonId])

  return { clients, ready }
}
