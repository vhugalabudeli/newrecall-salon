import {
  alertsConfigured,
  clearSubscription,
  dispatchDueAlerts,
  getVapidPublicKey,
  parseBody as parseAlertBody,
  saveSchedule,
  saveSubscription,
  type AlertPayload,
  type PushSubscriptionJSON,
} from './api/_lib/alerts.ts'
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

function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'CRON_SECRET',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }
}

function asPayload(value: unknown): AlertPayload | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (
    typeof row.title !== 'string' ||
    typeof row.body !== 'string' ||
    typeof row.tag !== 'string'
  ) {
    return null
  }
  return { title: row.title, body: row.body, tag: row.tag }
}

export function alertsApiPlugin(): Plugin {
  return {
    name: 'alerts-api',
    config(_, { mode }) {
      applyEnv(mode)
    },
    configureServer(server) {
      applyEnv(server.config.mode)
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/alerts/')) {
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

            if (path === '/api/alerts/vapid') {
              if (req.method !== 'GET') {
                res.statusCode = 405
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Method not allowed' }))
                return
              }
              if (!alertsConfigured()) {
                res.statusCode = 503
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    configured: false,
                    error: 'Alert push is not configured.',
                  }),
                )
                return
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  configured: true,
                  publicKey: getVapidPublicKey(),
                }),
              )
              return
            }

            if (path === '/api/alerts/dispatch') {
              if (req.method !== 'GET' && req.method !== 'POST') {
                res.statusCode = 405
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Method not allowed' }))
                return
              }
              const result = await dispatchDueAlerts()
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            if (!alertsConfigured()) {
              res.statusCode = 503
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Alert push is not configured.' }))
              return
            }

            const body = parseAlertBody(await readJson(req))

            if (path === '/api/alerts/subscribe') {
              const email = typeof body.email === 'string' ? body.email : ''
              if (body.clear === true) {
                await clearSubscription(email)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
                return
              }
              const subscription = body.subscription as
                | PushSubscriptionJSON
                | undefined
              if (
                !subscription?.endpoint ||
                !subscription.keys?.p256dh ||
                !subscription.keys?.auth
              ) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({ error: 'Push subscription is required.' }),
                )
                return
              }
              await saveSubscription(email, subscription)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
              return
            }

            if (path === '/api/alerts/schedule') {
              const email = typeof body.email === 'string' ? body.email : ''
              const prefsRaw =
                body.prefs && typeof body.prefs === 'object'
                  ? (body.prefs as Record<string, unknown>)
                  : {}
              await saveSchedule({
                email,
                timezone:
                  typeof body.timezone === 'string' && body.timezone
                    ? body.timezone
                    : 'UTC',
                hour: typeof body.hour === 'number' ? body.hour : 8,
                prefs: {
                  dueToday: prefsRaw.dueToday === true,
                  overdue: prefsRaw.overdue === true,
                },
                dueToday: asPayload(body.dueToday),
                overdue: asPayload(body.overdue),
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
              return
            }

            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Not found' }))
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Request failed.'
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: message }))
          }
        })()
      })
    },
  }
}
