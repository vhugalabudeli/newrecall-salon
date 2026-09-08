import type { VercelRequest, VercelResponse } from '@vercel/node'
import { alertsConfigured, dispatchDueAlerts } from '../_lib/alerts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!alertsConfigured()) {
    res.status(503).json({ error: 'Alert push is not configured.' })
    return
  }

  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = req.headers.authorization ?? ''
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  try {
    const result = await dispatchDueAlerts()
    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    res.status(500).json({ error: message })
  }
}
