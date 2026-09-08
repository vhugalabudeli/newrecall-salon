export type NotificationTriggerResult = 'sent' | 'denied' | 'unavailable'
export type NotificationPermissionResult = 'granted' | 'denied' | 'unavailable'

const PERIODIC_TAG = 'recall-alerts'

function notificationIcon(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return new URL('favicon.svg', `${window.location.origin}${base}`).href
}

async function showViaServiceWorker(
  title: string,
  options: NotificationOptions,
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('timeout')), 800)
      }),
    ])
    if (!registration?.showNotification) return false
    await registration.showNotification(title, options)
    return true
  } catch {
    return false
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermissionResult> {
  if (typeof Notification === 'undefined') return 'unavailable'
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission === 'granted') return 'granted'
  return 'denied'
}

export async function triggerLocalNotification(input: {
  title: string
  body: string
  tag: string
}): Promise<NotificationTriggerResult> {
  const permission = await ensureNotificationPermission()
  if (permission === 'unavailable') return 'unavailable'
  if (permission !== 'granted') return 'denied'

  const options: NotificationOptions = {
    body: input.body,
    tag: input.tag,
    icon: notificationIcon(),
    data: { url: '/app' },
  }

  if (await showViaServiceWorker(input.title, options)) return 'sent'

  try {
    const notification = new Notification(input.title, options)
    notification.onclick = () => {
      window.focus()
      window.location.assign('/app')
      notification.close()
    }
    return 'sent'
  } catch {
    return 'unavailable'
  }
}

export async function registerRecallPeriodicSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const periodic =
      'periodicSync' in registration
        ? (
            registration as ServiceWorkerRegistration & {
              periodicSync: {
                register: (
                  tag: string,
                  options?: { minInterval: number },
                ) => Promise<void>
              }
            }
          ).periodicSync
        : null
    if (!periodic) return false
    await periodic.register(PERIODIC_TAG, {
      minInterval: 12 * 60 * 60 * 1000,
    })
    return true
  } catch {
    return false
  }
}

export function notificationPermissionMessage(
  result: NotificationPermissionResult,
): string | null {
  if (result === 'granted') return null
  if (result === 'denied') return 'Allow notifications in this browser.'
  return 'This browser cannot show notifications.'
}
