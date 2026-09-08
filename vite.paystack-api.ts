import {
  completeTrial,
  httpErrorStatus,
  initializeTrial,
  managementLink,
  parseBody,
  statusForEmail,
} from './api/_lib/paystack.ts'
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
  if (env.PAYSTACK_SECRET_KEY) {
    process.env.PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY
  }
  if (env.PAYSTACK_PLAN_CODE) {
    process.env.PAYSTACK_PLAN_CODE = env.PAYSTACK_PLAN_CODE
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
            const body = parseBody(await readJson(req))
            let payload: unknown
            if (path === '/api/paystack/initialize') {
              payload = await initializeTrial({
                email: body.email,
                userId: body.userId,
              })
            } else if (path === '/api/paystack/complete') {
              payload = await completeTrial({
                reference: body.reference,
                email: body.email,
                userId: body.userId,
              })
            } else if (path === '/api/paystack/status') {
              payload = await statusForEmail(body.email)
            } else if (path === '/api/paystack/portal') {
              payload = {
                link: await managementLink({
                  email: body.email,
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
