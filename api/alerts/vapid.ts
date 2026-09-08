import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  alertsConfigured,
  getVapidPublicKey,
  parseBody,
} from '../_lib/alerts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!alertsConfigured()) {
    res.status(503).json({ error: 'Alert push is not configured.', configured: false })
    return
  }
  try {
    res.status(200).json({
      configured: true,
      publicKey: getVapidPublicKey(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    res.status(500).json({ error: message })
  }
}
