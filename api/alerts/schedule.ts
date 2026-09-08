import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  alertsConfigured,
  parseBody,
  saveSchedule,
  type AlertPayload,
} from '../_lib/alerts'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!alertsConfigured()) {
    res.status(503).json({ error: 'Alert push is not configured.' })
    return
  }

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    res.status(500).json({ error: message })
  }
}
