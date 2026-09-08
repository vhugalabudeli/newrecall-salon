import type { AlertPrefs } from './alertPrefs'
import {
  claimAlertSentDay,
  clearAlertSentDay,
  readAlertSnapshot,
  writeAlertSnapshot,
  type AlertPayload,
} from './alertSnapshot'
import {
  ensureNotificationPermission,
  registerRecallPeriodicSync,
  triggerLocalNotification,
  type NotificationTriggerResult,
} from './notifications'
import { uploadAlertSchedule } from './pushAlerts'
import {
  dueToday,
  overdueClients,
  recallDate,
  timeFrameLabel,
  todayIso,
} from './schedule'
import type { Client } from '../types'

export function dueTodayBody(clients: Client[]): string {
  if (clients.length === 0) return 'No recalls due today.'
  if (clients.length === 1) return `${clients[0].clientName} is due today.`
  if (clients.length === 2) {
    return `${clients[0].clientName} and ${clients[1].clientName} are due today.`
  }
  return `${clients[0].clientName} and ${clients.length - 1} others are due today.`
}

export function overdueBody(clients: Client[], today: Date): string {
  if (clients.length === 0) return 'No overdue recalls.'
  const first = clients[0]
  const span = timeFrameLabel(recallDate(first), today)
  if (clients.length === 1) return `${first.clientName} is ${span}.`
  return `${clients.length} overdue recalls. ${first.clientName} is ${span}.`
}

function notificationIconUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return new URL('favicon.svg', `${window.location.origin}${base}`).href
}

export async function syncRecallNotifications(
  clients: Client[],
  prefs: AlertPrefs,
  options: { email?: string; today?: Date } = {},
): Promise<void> {
  if (!prefs.dueToday && !prefs.overdue) return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const today = options.today ?? new Date()
  const day = todayIso(today)
  const due = prefs.dueToday ? dueToday(clients, today) : []
  const overdue = prefs.overdue ? overdueClients(clients, today) : []

  const duePayload: AlertPayload | null =
    due.length > 0
      ? {
          title: 'Due today',
          body: dueTodayBody(due),
          tag: 'salon-due-today',
        }
      : null
  const overduePayload: AlertPayload | null =
    overdue.length > 0
      ? {
          title: 'Overdue',
          body: overdueBody(overdue, today),
          tag: 'salon-overdue',
        }
      : null

  const existing = await readAlertSnapshot()

  await writeAlertSnapshot({
    prefs,
    day,
    dueToday: duePayload,
    overdue: overduePayload,
    dueTodaySentDay: existing?.dueTodaySentDay ?? null,
    overdueSentDay: existing?.overdueSentDay ?? null,
    iconUrl: notificationIconUrl(),
    openUrl: '/app',
  })

  if (options.email) {
    await uploadAlertSchedule({
      email: options.email,
      prefs,
      dueToday: duePayload,
      overdue: overduePayload,
    })
  }

  await registerRecallPeriodicSync()

  if (duePayload) {
    await sendOnce('dueToday', day, duePayload)
  }
  if (overduePayload) {
    await sendOnce('overdue', day, overduePayload)
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({ type: 'recall-alerts-check' })
    } catch {
      /* ignore */
    }
  }
}

export async function sendOnce(
  kind: 'dueToday' | 'overdue',
  day: string,
  input: AlertPayload,
): Promise<NotificationTriggerResult | null> {
  const claimed = await claimAlertSentDay(kind, day)
  if (!claimed) return null
  const result = await triggerLocalNotification(input)
  if (result !== 'sent') {
    await clearAlertSentDay(kind)
  }
  return result
}

export async function sendTestNotification(): Promise<NotificationTriggerResult> {
  const permission = await ensureNotificationPermission()
  if (permission === 'unavailable') return 'unavailable'
  if (permission !== 'granted') return 'denied'
  return triggerLocalNotification({
    title: 'NewRecall',
    body: 'Test alert — notifications are working on this device.',
    tag: 'salon-test',
  })
}
