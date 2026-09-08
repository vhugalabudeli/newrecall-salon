import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendAdmin } from '../_lib/adminHttp'

export default function handler(req: VercelRequest, res: VercelResponse) {
  void sendAdmin(req, res, 'lookup')
}
