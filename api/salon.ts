import type { VercelRequest, VercelResponse } from '@vercel/node'
import { postInvite } from './_lib/salonInvite.js'
import { postDeleteSalon } from './_lib/salonDelete.js'
import { routeAction } from './_lib/routeAction.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = routeAction(req, '/api/salon')
  if (action === 'delete') {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    void postDeleteSalon(req, res)
    return
  }
  if (action !== 'invite') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  void postInvite(req, res)
}
