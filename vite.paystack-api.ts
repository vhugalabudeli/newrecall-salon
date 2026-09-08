import {
  completeTrial,
  httpErrorStatus,
  initializeTrial,
  managementLink,
  parseBody,
  statusForEmail,
} from './api/_lib/paystack.ts'
import {
  actorFromRequest,
  billingEmailForSalon,
  requireOwner,
} from './api/_lib/salonAuth.ts'
import { loadEnv, type Plugin } from 'vite'

async function readJson(
  req: import('http').IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

function header(req: import('http').IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PLAN_CODE',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }
}

export function paystackApiPlugin(): Plugin {
  return {
    name: 'paystack-api',
    config(_, { mode }) {
      applyEnv(mode)
    },
    configureServer(server) {
      applyEnv(server.config.mode)
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/paystack/')) {
          next()
          return
        }
        void (async () => {
          try {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            const auth = header(req, 'authorization')
            const body = parseBody(await readJson(req))
            let payload: unknown
            if (path === '/api/paystack/initialize') {
              const owner = await requireOwner(auth)
              const email = await billingEmailForSalon(owner)
              payload = await initializeTrial({
                email,
                userId: owner.userId,
                salonId: owner.salonId,
              })
            } else if (path === '/api/paystack/complete') {
              const owner = await requireOwner(auth)
              const email = await billingEmailForSalon(owner)
              payload = await completeTrial({
                reference: body.reference,
                email,
                userId: owner.userId,
                salonId: owner.salonId,
              })
            } else if (path === '/api/paystack/status') {
              const actor = await actorFromRequest(auth)
              const email = await billingEmailForSalon(actor)
              payload = await statusForEmail(email)
            } else if (path === '/api/paystack/portal') {
              const owner = await requireOwner(auth)
              const email = await billingEmailForSalon(owner)
              payload = {
                link: await managementLink({
                  email,
                  subscriptionCode: body.subscriptionCode,
                }),
              }
            } else {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Not found' }))
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Request failed.'
            res.statusCode = httpErrorStatus(error)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: message }))
          }
        })()
      })
    },
  }
}
