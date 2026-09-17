import { loadEnv, type Plugin } from 'vite'
import {
  checkPromoAvailable,
  claimPromoCode,
  gateChampionJoin,
  getRewardConfig,
  getRewardHub,
  lookupPromoCode,
} from './api/_lib/rewards.ts'

function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
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

function header(req: import('http').IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

export function rewardsApiPlugin(): Plugin {
  return {
    name: 'rewards-api',
    config(_, { mode }) {
      applyEnv(mode)
    },
    configureServer(server) {
      applyEnv(server.config.mode)
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/rewards/')) {
          next()
          return
        }
        void (async () => {
          const vercelReq = {
            method: req.method,
            headers: req.headers,
            body: req.method === 'GET' ? {} : await readJson(req),
            query: Object.fromEntries(new URL(req.url || '/', 'http://local').searchParams),
            socket: { remoteAddress: req.socket.remoteAddress },
          } as import('@vercel/node').VercelRequest
          const vercelRes = {
            status(code: number) {
              res.statusCode = code
              return {
                json(payload: unknown) {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(payload))
                },
                end() {
                  res.end()
                },
              }
            },
          } as import('@vercel/node').VercelResponse
          vercelReq.headers.authorization = header(req, 'authorization')
          if (path === '/api/rewards/config') {
            await getRewardConfig(vercelReq, vercelRes)
            return
          }
          if (path === '/api/rewards/join') {
            await gateChampionJoin(vercelReq, vercelRes)
            return
          }
          if (path === '/api/rewards/lookup') {
            await lookupPromoCode(vercelReq, vercelRes)
            return
          }
          if (path === '/api/rewards/available') {
            await checkPromoAvailable(vercelReq, vercelRes)
            return
          }
          if (path === '/api/rewards/claim') {
            await claimPromoCode(vercelReq, vercelRes)
            return
          }
          if (path === '/api/rewards/hub') {
            await getRewardHub(vercelReq, vercelRes)
            return
          }
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Not found' }))
        })()
      })
    },
  }
}
