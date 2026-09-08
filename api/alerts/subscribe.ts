import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  alertsConfigured,
  clearSubscription,
  parseBody,
  saveSubscription,
  type PushSubscriptionJSON,
} from '../_lib/alerts'

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
    if (body.clear === true) {
      await clearSubscription(email)
      res.status(200).json({ ok: true })
      return
    }
    const subscription = body.subscription as PushSubscriptionJSON | undefined
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      res.status(400).json({ error: 'Push subscription is required.' })
      return
    }
    await saveSubscription(email, subscription)
    res.status(200).json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    res.status(500).json({ error: message })
  }
}
