import { useEffect } from 'react'
import { useAlertPrefs } from '../hooks/useAlertPrefs'
import { useAuth } from '../hooks/useAuth'
import { useClients } from '../hooks/useClients'
import { syncRecallNotifications } from '../lib/recallAlerts'

export function RecallAlertHost() {
  const { clients, ready } = useClients()
  const { prefs } = useAlertPrefs()
  const { user } = useAuth()

  useEffect(() => {
    if (!ready) return
    void syncRecallNotifications(clients, prefs, { email: user?.email })
  }, [clients, prefs, ready, user?.email])

  return null
}
