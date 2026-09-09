import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  methodGuard,
  postComplete,
  postInitialize,
  postPortal,
  postStatus,
} from './_lib/handlers.js'
import { routeAction } from './_lib/routeAction.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = routeAction(req, '/api/paystack')
  if (action === 'initialize') {
    methodGuard(req, res, postInitialize)
    return
  }
  if (action === 'complete') {
    methodGuard(req, res, postComplete)
    return
  }
  if (action === 'status') {
    methodGuard(req, res, postStatus)
    return
  }
  if (action === 'portal') {
    methodGuard(req, res, postPortal)
    return
  }
  res.status(404).json({ error: 'Not found' })
}
