import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseBody } from './paystack.js'
import {
  AdminHttpError,
  adminConfigured,
  clearSessionCookie,
  loginOperator,
  readSession,
} from './adminAuth.js'
import { addAudit, addSupportNote, listSupportNotes } from './adminOps.js'
import {
  exportTenantBook,
  restoreTenantBook,
  salonCloudConfigured,
} from './salonBook.js'
import {
  assembleOverview,
  billingCsv,
  lookupEmail,
  portalFor,
  repairStuck,
} from './adminOverview.js'

export type AdminAction =
  | 'login'
  | 'logout'
  | 'session'
  | 'overview'
  | 'lookup'
  | 'repair'
  | 'portal'
  | 'support'
  | 'csv'
  | 'tenant-export'
  | 'tenant-restore'

export type AdminDispatch = {
  action: AdminAction
  method: string
  query: Record<string, string>
  body: Record<string, string>
  cookieHeader: string | undefined
}

export type AdminResult = {
  status: number
  headers: Record<string, string>
  body: string
  setCookie?: string
}

const JSON_HEADER = { 'Content-Type': 'application/json; charset=utf-8' }

function json(status: number, payload: unknown, setCookie?: string): AdminResult {
  return {
    status,
    headers: JSON_HEADER,
    body: JSON.stringify(payload),
    setCookie,
  }
}

function queryString(query: VercelRequest['query']): Record<string, string> {
  const out: Record<string, string> = {}
  if (!query) return out
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') out[key] = value
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0]
  }
  return out
}

async function readVercelBody(req: VercelRequest): Promise<Record<string, string>> {
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

export async function dispatchAdmin(input: AdminDispatch): Promise<AdminResult> {
  const method = input.method.toUpperCase()
  try {
    if (input.action === 'login') {
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      const cookie = loginOperator(input.body.email || '', input.body.password || '')
      const email = input.body.email.trim().toLowerCase()
      await addAudit({
        operatorEmail: email,
        action: 'login',
        detail: email,
      })
      return json(200, { email }, cookie)
    }

    if (input.action === 'logout') {
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      return json(200, { ok: true }, clearSessionCookie())
    }

    const session = readSession(input.cookieHeader)

    if (input.action === 'session') {
      if (method !== 'GET') throw new AdminHttpError(405, 'Method not allowed')
      return json(200, {
        email: session.email,
        configured: adminConfigured(),
      })
    }

    if (input.action === 'overview') {
      if (method !== 'GET') throw new AdminHttpError(405, 'Method not allowed')
      const overview = await assembleOverview()
      return json(200, overview)
    }

    if (input.action === 'lookup') {
      if (method !== 'GET') throw new AdminHttpError(405, 'Method not allowed')
      const email = (input.query.email || '').trim()
      if (!email) throw new AdminHttpError(400, 'Email is required.')
      const row = await lookupEmail(email)
      return json(200, row)
    }

    if (input.action === 'repair') {
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      const billed = await repairStuck({
        email: input.body.email || '',
        reference: input.body.reference || '',
        userId: input.body.userId,
      })
      await addAudit({
        operatorEmail: session.email,
        action: 'repair',
        detail: `${input.body.email} ${input.body.reference}`,
      })
      return json(200, billed)
    }

    if (input.action === 'portal') {
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      const link = await portalFor(
        input.body.email || '',
        input.body.subscriptionCode || '',
      )
      return json(200, { link })
    }

    if (input.action === 'support') {
      if (method === 'GET') {
        return json(200, { notes: await listSupportNotes() })
      }
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      const kind = input.body.kind === 'billing' ? 'billing' : 'book_locked'
      const note = await addSupportNote({
        operatorEmail: session.email,
        kind,
        email: input.body.email || '',
        note: input.body.note || '',
      })
      await addAudit({
        operatorEmail: session.email,
        action: 'support',
        detail: `${kind} ${input.body.email}`,
      })
      if (!note) {
        return json(200, {
          stored: false,
          error: 'Support notes are not stored (Redis is not configured).',
        })
      }
      return json(200, { stored: true, note })
    }

    if (input.action === 'csv') {
      if (method !== 'GET') throw new AdminHttpError(405, 'Method not allowed')
      const overview = await assembleOverview()
      await addAudit({
        operatorEmail: session.email,
        action: 'csv',
        detail: 'Billing CSV downloaded',
      })
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="newrecall-billing.csv"',
        },
        body: billingCsv(overview),
      }
    }

    if (input.action === 'tenant-export') {
      if (method !== 'GET') throw new AdminHttpError(405, 'Method not allowed')
      if (!salonCloudConfigured()) {
        throw new AdminHttpError(503, 'Supabase is not configured.')
      }
      const salonId = (input.query.salonId || '').trim()
      if (!salonId) throw new AdminHttpError(400, 'Salon id is required.')
      const backup = await exportTenantBook(salonId)
      await addAudit({
        operatorEmail: session.email,
        action: 'tenant-export',
        detail: salonId,
      })
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="newrecall-tenant-${salonId}.json"`,
        },
        body: JSON.stringify(backup, null, 2),
      }
    }

    if (input.action === 'tenant-restore') {
      if (method !== 'POST') throw new AdminHttpError(405, 'Method not allowed')
      if (!salonCloudConfigured()) {
        throw new AdminHttpError(503, 'Supabase is not configured.')
      }
      const salonId = (input.body.salonId || '').trim()
      if (!salonId) throw new AdminHttpError(400, 'Salon id is required.')
      let raw: unknown
      try {
        raw = JSON.parse(input.body.backup || '') as unknown
      } catch {
        throw new AdminHttpError(400, 'That file is not a valid NewRecall salon backup.')
      }
      await restoreTenantBook(salonId, raw)
      await addAudit({
        operatorEmail: session.email,
        action: 'tenant-restore',
        detail: salonId,
      })
      return json(200, { ok: true })
    }

    throw new AdminHttpError(404, 'Not found')
  } catch (error: unknown) {
    if (error instanceof AdminHttpError) {
      const httpError = error
      return json(httpError.status, { error: httpError.message })
    }
    const message = error instanceof Error ? error.message : 'The operations request could not be completed. Please try again.'
    const status = message.includes('Missing PAYSTACK_SECRET_KEY') ? 503 : 400
    return json(status, { error: message })
  }
}

export async function sendAdmin(
  req: VercelRequest,
  res: VercelResponse,
  action: AdminAction,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  const result = await dispatchAdmin({
    action,
    method: req.method || 'GET',
    query: queryString(req.query),
    body: await readVercelBody(req),
    cookieHeader:
      typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  })
  if (result.setCookie) res.setHeader('Set-Cookie', result.setCookie)
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value)
  }
  res.status(result.status).send(result.body)
}
