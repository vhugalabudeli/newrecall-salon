import type { VercelRequest, VercelResponse } from '@vercel/node'
import { postInvite } from './_lib/salonInvite.ts'
import { routeAction } from './_lib/routeAction.ts'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = routeAction(req, '/api/salon')
  if (action !== 'invite') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  void postInvite(req, res)
}
