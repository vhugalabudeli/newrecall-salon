import { loadEnv, type Plugin } from 'vite'
import inviteHandler from './api/salon/invite.ts'

function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }
}

export function salonApiPlugin(): Plugin {
  return {
    name: 'salon-api',
    config(_, { mode }) {
      applyEnv(mode)
    },
    configureServer(server) {
      applyEnv(server.config.mode)
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (path !== '/api/salon/invite') {
          next()
          return
        }
        void (async () => {
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const raw = Buffer.concat(chunks).toString('utf8')
          let body: unknown = {}
          if (raw) {
            try {
              body = JSON.parse(raw)
            } catch {
              body = {}
            }
          }
          const vercelReq = {
            method: req.method,
            headers: req.headers,
            body,
            query: {},
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
          await inviteHandler(vercelReq, vercelRes)
        })()
      })
    },
  }
}
