import type { VercelRequest, VercelResponse } from '@vercel/node'
import { routeAction } from './_lib/routeAction.js'
import {
  checkPromoAvailable,
  claimPromoCode,
  gateChampionJoin,
  getRewardConfig,
  getRewardHub,
  lookupPromoCode,
} from './_lib/rewards.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = routeAction(req, '/api/rewards')
  if (action === 'config') {
    void getRewardConfig(req, res)
    return
  }
  if (action === 'join') {
    void gateChampionJoin(req, res)
    return
  }
  if (action === 'lookup') {
    void lookupPromoCode(req, res)
    return
  }
  if (action === 'available') {
    void checkPromoAvailable(req, res)
    return
  }
  if (action === 'claim') {
    void claimPromoCode(req, res)
    return
  }
  if (action === 'hub') {
    void getRewardHub(req, res)
    return
  }
  res.status(404).json({ error: 'Not found' })
}
