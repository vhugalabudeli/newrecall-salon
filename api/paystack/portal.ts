import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, postPortal } from '../_lib/handlers'

export default function handler(req: VercelRequest, res: VercelResponse) {
  methodGuard(req, res, postPortal)
}
