import type { AlertPrefs } from './alertPrefs'
import type { AlertPayload } from './alertSnapshot'

export type PushConfig = {
  configured: boolean
  publicKey?: string
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('timeout')), 4000)
      }),
    ])
  } catch {
    const existing = await navigator.serviceWorker.getRegistration()
    return existing ?? null
  }
}

export async function fetchPushConfig(): Promise<PushConfig> {
  try {
    const res = await fetch('/api/alerts/vapid')
    if (!res.ok) return { configured: false }
    const data = (await res.json()) as { configured?: boolean; publicKey?: string }
    if (!data.configured || !data.publicKey) return { configured: false }
    return { configured: true, publicKey: data.publicKey }
  } catch {
    return { configured: false }
  }
}

export async function subscribeWebPush(email: string): Promise<'ok' | 'unavailable' | 'denied'> {
  if (!email.trim()) return 'unavailable'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unavailable'
  const config = await fetchPushConfig()
  if (!config.configured || !config.publicKey) return 'unavailable'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const registration = await serviceWorkerRegistration()
  if (!registration?.pushManager) return 'unavailable'
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      })
    } catch {
      return 'unavailable'
    }
  }

  try {
    const res = await postJson('/api/alerts/subscribe', {
      email,
      subscription: subscription.toJSON(),
    })
    return res.ok ? 'ok' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export async function unsubscribeWebPush(email: string): Promise<void> {
  if (!email.trim()) return
  try {
    const registration = await serviceWorkerRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    await subscription?.unsubscribe()
  } catch {
    /* ignore */
  }
  try {
    await postJson('/api/alerts/subscribe', { email, clear: true })
  } catch {
    /* ignore */
  }
}

export async function uploadAlertSchedule(input: {
  email: string
  prefs: AlertPrefs
  dueToday: AlertPayload | null
  overdue: AlertPayload | null
  hour?: number
}): Promise<boolean> {
  if (!input.email.trim()) return false
  try {
    const res = await postJson('/api/alerts/schedule', {
      email: input.email,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      hour: input.hour ?? 8,
      prefs: input.prefs,
      dueToday: input.dueToday,
      overdue: input.overdue,
    })
    return res.ok
  } catch {
    return false
  }
}
