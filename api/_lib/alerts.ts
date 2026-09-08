import { Redis } from '@upstash/redis'
import webpush from 'web-push'

export type PushSubscriptionJSON = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

export type AlertPayload = {
  title: string
  body: string
  tag: string
}

export type AlertScheduleRecord = {
  email: string
  timezone: string
  hour: number
  prefs: { dueToday: boolean; overdue: boolean }
  dueToday: AlertPayload | null
  overdue: AlertPayload | null
  dueTodaySentDay: string | null
  overdueSentDay: string | null
  updatedAt: string
}

export type AlertSubscriptionRecord = {
  email: string
  subscription: PushSubscriptionJSON
  updatedAt: string
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export function alertsConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim() &&
      process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  )
}

export function getVapidPublicKey(): string {
  return requireEnv('VAPID_PUBLIC_KEY')
}

function redis(): Redis {
  return new Redis({
    url: requireEnv('UPSTASH_REDIS_REST_URL'),
    token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
  })
}

function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

function subKey(email: string) {
  return `alert:sub:${emailKey(email)}`
}

function scheduleKey(email: string) {
  return `alert:schedule:${emailKey(email)}`
}

const INDEX_KEY = 'alert:emails'

export function configureWebPush() {
  webpush.setVapidDetails(
    requireEnv('VAPID_SUBJECT'),
    requireEnv('VAPID_PUBLIC_KEY'),
    requireEnv('VAPID_PRIVATE_KEY'),
  )
}

export async function saveSubscription(
  email: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  const key = emailKey(email)
  if (!key || !subscription.endpoint) {
    throw new Error('Email and push subscription are required.')
  }
  const client = redis()
  const record: AlertSubscriptionRecord = {
    email: key,
    subscription,
    updatedAt: new Date().toISOString(),
  }
  await client.set(subKey(key), record)
  await client.sadd(INDEX_KEY, key)
}

export async function clearSubscription(email: string): Promise<void> {
  const key = emailKey(email)
  const client = redis()
  await client.del(subKey(key))
  await client.srem(INDEX_KEY, key)
}

export async function saveSchedule(
  input: Omit<AlertScheduleRecord, 'updatedAt' | 'dueTodaySentDay' | 'overdueSentDay'> & {
    dueTodaySentDay?: string | null
    overdueSentDay?: string | null
  },
): Promise<void> {
  const key = emailKey(input.email)
  if (!key) throw new Error('Email is required.')
  const client = redis()
  const existing = (await client.get<AlertScheduleRecord>(scheduleKey(key))) ?? null
  const record: AlertScheduleRecord = {
    email: key,
    timezone: input.timezone || 'UTC',
    hour: Number.isFinite(input.hour) ? Math.min(23, Math.max(0, input.hour)) : 8,
    prefs: {
      dueToday: input.prefs.dueToday === true,
      overdue: input.prefs.overdue === true,
    },
    dueToday: input.dueToday,
    overdue: input.overdue,
    dueTodaySentDay: input.dueTodaySentDay ?? existing?.dueTodaySentDay ?? null,
    overdueSentDay: input.overdueSentDay ?? existing?.overdueSentDay ?? null,
    updatedAt: new Date().toISOString(),
  }
  await client.set(scheduleKey(key), record)
  await client.sadd(INDEX_KEY, key)
}

function localParts(timeZone: string, now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  }
}

async function sendPayload(
  subscription: PushSubscriptionJSON,
  payload: AlertPayload,
): Promise<'sent' | 'gone'> {
  configureWebPush()
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        url: '/app',
      }),
    )
    return 'sent'
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0
    if (status === 404 || status === 410) return 'gone'
    throw error
  }
}

export async function dispatchDueAlerts(now = new Date()): Promise<{
  checked: number
  sent: number
}> {
  if (!alertsConfigured()) {
    throw new Error('Alert push is not configured.')
  }
  const client = redis()
  const emails = (await client.smembers(INDEX_KEY)) as string[]
  let sent = 0

  for (const email of emails) {
    const schedule = await client.get<AlertScheduleRecord>(scheduleKey(email))
    const subscription = await client.get<AlertSubscriptionRecord>(subKey(email))
    if (!schedule || !subscription) continue

    const { day, hour } = localParts(schedule.timezone || 'UTC', now)
    // Fire in the preferred local hour window (and the next hour as catch-up).
    const dueHour = schedule.hour
    if (hour !== dueHour && hour !== (dueHour + 1) % 24) continue

    let changed = false

    if (schedule.prefs.dueToday && schedule.dueToday && schedule.dueTodaySentDay !== day) {
      const result = await sendPayload(subscription.subscription, schedule.dueToday)
      if (result === 'gone') {
        await client.del(subKey(email))
        continue
      }
      schedule.dueTodaySentDay = day
      changed = true
      sent += 1
    }

    if (schedule.prefs.overdue && schedule.overdue && schedule.overdueSentDay !== day) {
      const result = await sendPayload(subscription.subscription, schedule.overdue)
      if (result === 'gone') {
        await client.del(subKey(email))
        continue
      }
      schedule.overdueSentDay = day
      changed = true
      sent += 1
    }

    if (changed) {
      schedule.updatedAt = new Date().toISOString()
      await client.set(scheduleKey(email), schedule)
    }
  }

  return { checked: emails.length, sent }
}

export function parseBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Record<string, unknown>
}
