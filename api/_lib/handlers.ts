import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  completeTrial,
  httpErrorStatus,
  initializeTrial,
  managementLink,
  parseBody,
  statusForEmail,
} from './paystack.js'
import {
  actorFromRequest,
  billingEmailForSalon,
  requireOwner,
} from './salonAuth.js'

async function readBody(req: VercelRequest): Promise<Record<string, string>> {
  if (typeof req.body === 'string') {
    try {
      return parseBody(JSON.parse(req.body) as unknown)
    } catch {
      return {}
    }
  }
  if (req.body && typeof req.body === 'object') return parseBody(req.body)
  return {}
}

function authHeader(req: VercelRequest): string | undefined {
  const value = req.headers.authorization
  return typeof value === 'string' ? value : undefined
}

function sendError(res: VercelResponse, error: unknown) {
  const message = error instanceof Error ? error.message : 'We could not complete the billing request. Please try again.'
  res.status(httpErrorStatus(error)).json({ error: message })
}

export async function postInitialize(req: VercelRequest, res: VercelResponse) {
  try {
    const owner = await requireOwner(authHeader(req))
    const email = await billingEmailForSalon(owner)
    const data = await initializeTrial({
      email,
      userId: owner.userId,
      salonId: owner.salonId,
    })
    res.status(200).json(data)
  } catch (error) {
    sendError(res, error)
  }
}

export async function postComplete(req: VercelRequest, res: VercelResponse) {
  try {
    const owner = await requireOwner(authHeader(req))
    const body = await readBody(req)
    const email = await billingEmailForSalon(owner)
    const data = await completeTrial({
      reference: body.reference,
      email,
      userId: owner.userId,
      salonId: owner.salonId,
    })
    res.status(200).json(data)
  } catch (error) {
    sendError(res, error)
  }
}

export async function postStatus(req: VercelRequest, res: VercelResponse) {
  try {
    const actor = await actorFromRequest(authHeader(req))
    const email = await billingEmailForSalon(actor)
    const data = await statusForEmail(email)
    res.status(200).json(data)
  } catch (error) {
    sendError(res, error)
  }
}

export async function postPortal(req: VercelRequest, res: VercelResponse) {
  try {
    const owner = await requireOwner(authHeader(req))
    const body = await readBody(req)
    const email = await billingEmailForSalon(owner)
    const link = await managementLink({
      email,
      subscriptionCode: body.subscriptionCode,
    })
    res.status(200).json({ link })
  } catch (error) {
    sendError(res, error)
  }
}

export function methodGuard(
  req: VercelRequest,
  res: VercelResponse,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  void handler(req, res)
}
