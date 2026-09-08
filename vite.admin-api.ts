import { loadEnv, type Plugin } from 'vite'
import { dispatchAdmin, type AdminAction } from './api/_lib/adminHttp.ts'
import { parseBody } from './api/_lib/paystack.ts'

const ACTIONS: Record<string, AdminAction> = {
  '/api/admin/login': 'login',
  '/api/admin/logout': 'logout',
  '/api/admin/session': 'session',
  '/api/admin/overview': 'overview',
  '/api/admin/lookup': 'lookup',
  '/api/admin/repair': 'repair',
  '/api/admin/portal': 'portal',
  '/api/admin/support': 'support',
  '/api/admin/csv': 'csv',
  '/api/admin/tenant-export': 'tenant-export',
  '/api/admin/tenant-restore': 'tenant-restore',
}

async function readJson(
  req: import('http').IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return {}
  }
}

function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PLAN_CODE',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'ADMIN_SESSION_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }
}

function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {}
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
  for (const part of q.split('&')) {
    if (!part) continue
    const [k, v] = part.split('=')
    if (!k) continue
    out[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return out
}

export function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api',
    config(_, { mode }) {
      applyEnv(mode)
    },
    configureServer(server) {
      applyEnv(server.config.mode)
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? ''
        const path = rawUrl.split('?')[0] ?? ''
        const action = ACTIONS[path]
        if (!action) {
          next()
          return
        }
        void (async () => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }
          const body =
            req.method === 'POST' ? parseBody(await readJson(req)) : {}
          const result = await dispatchAdmin({
            action,
            method: req.method || 'GET',
            query: queryOf(rawUrl),
            body,
            cookieHeader: req.headers.cookie,
          })
          res.statusCode = result.status
          if (result.setCookie) res.setHeader('Set-Cookie', result.setCookie)
          for (const [key, value] of Object.entries(result.headers)) {
            res.setHeader(key, value)
          }
          res.end(result.body)
        })()
      })
    },
  }
}
