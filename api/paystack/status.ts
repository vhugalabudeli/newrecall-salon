import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, postStatus } from '../_lib/handlers'

export default function handler(req: VercelRequest, res: VercelResponse) {
  methodGuard(req, res, postStatus)
}
