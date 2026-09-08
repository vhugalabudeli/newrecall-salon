import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, postComplete } from '../_lib/handlers'

export default function handler(req: VercelRequest, res: VercelResponse) {
  methodGuard(req, res, postComplete)
}
