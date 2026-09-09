import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendAdmin, type AdminAction } from './_lib/adminHttp.ts'
import { routeAction } from './_lib/routeAction.ts'

const ACTIONS = new Set<AdminAction>([
  'login',
  'logout',
  'session',
  'overview',
  'lookup',
  'repair',
  'portal',
  'support',
  'csv',
  'tenant-export',
  'tenant-restore',
])

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = routeAction(req, '/api/admin')
  if (!ACTIONS.has(action as AdminAction)) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  void sendAdmin(req, res, action as AdminAction)
}
