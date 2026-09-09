import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  alertsConfigured,
  clearSubscription,
  dispatchDueAlerts,
  getVapidPublicKey,
  parseBody,
  saveSchedule,
  saveSubscription,
  type AlertPayload,
  type PushSubscriptionJSON,
} from './_lib/alerts.js'
import { routeAction } from './_lib/routeAction.js'

function asPayload(value: unknown): AlertPayload | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (
    typeof row.title !== 'string' ||
    typeof row.body !== 'string' ||
    typeof row.tag !== 'string'
  ) {
    return null
  }
  return { title: row.title, body: row.body, tag: row.tag }
}

function fail(res: VercelResponse, status: number, error: string, extra?: object) {
  res.status(status).json({ error, ...extra })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const action = routeAction(req, '/api/alerts')
  try {
    if (action === 'vapid') {
      if (req.method !== 'GET') {
        fail(res, 405, 'Method not allowed')
        return
      }
      if (!alertsConfigured()) {
        fail(res, 503, 'Alert push is not configured.', { configured: false })
        return
      }
      res.status(200).json({
        configured: true,
        publicKey: getVapidPublicKey(),
      })
      return
    }

    if (action === 'dispatch') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        fail(res, 405, 'Method not allowed')
        return
      }
      if (!alertsConfigured()) {
        fail(res, 503, 'Alert push is not configured.')
        return
      }
      const secret = process.env.CRON_SECRET?.trim()
      if (secret) {
        const auth = req.headers.authorization ?? ''
        if (auth !== `Bearer ${secret}`) {
          fail(res, 401, 'Unauthorized')
          return
        }
      }
      res.status(200).json(await dispatchDueAlerts())
      return
    }

    if (req.method !== 'POST') {
      fail(res, 405, 'Method not allowed')
      return
    }
    if (!alertsConfigured()) {
      fail(res, 503, 'Alert push is not configured.')
      return
    }

    if (action === 'subscribe') {
      const body = parseBody(req.body)
      const email = typeof body.email === 'string' ? body.email : ''
      if (body.clear === true) {
        await clearSubscription(email)
        res.status(200).json({ ok: true })
        return
      }
      const subscription = body.subscription as PushSubscriptionJSON | undefined
      if (
        !subscription?.endpoint ||
        !subscription.keys?.p256dh ||
        !subscription.keys?.auth
      ) {
        fail(res, 400, 'Push subscription is required.')
        return
      }
      await saveSubscription(email, subscription)
      res.status(200).json({ ok: true })
      return
    }

    if (action === 'schedule') {
      const body = parseBody(req.body)
      const email = typeof body.email === 'string' ? body.email : ''
      const timezone =
        typeof body.timezone === 'string' && body.timezone
          ? body.timezone
          : 'UTC'
      const hour = typeof body.hour === 'number' ? body.hour : 8
      const prefsRaw =
        body.prefs && typeof body.prefs === 'object'
          ? (body.prefs as Record<string, unknown>)
          : {}
      await saveSchedule({
        email,
        timezone,
        hour,
        prefs: {
          dueToday: prefsRaw.dueToday === true,
          overdue: prefsRaw.overdue === true,
        },
        dueToday: asPayload(body.dueToday),
        overdue: asPayload(body.overdue),
      })
      res.status(200).json({ ok: true })
      return
    }

    fail(res, 404, 'Not found')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    fail(res, 500, message)
  }
}
