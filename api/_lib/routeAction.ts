import type { VercelRequest } from '@vercel/node'

export function routeAction(req: VercelRequest, prefix: string): string {
  const query = req.query?.action
  if (typeof query === 'string' && query) return query
  if (Array.isArray(query) && typeof query[0] === 'string' && query[0]) {
    return query[0]
  }
  const path = (req.url || '').split('?')[0] || ''
  const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  if (path === base) return ''
  if (path.startsWith(`${base}/`)) return path.slice(base.length + 1)
  return ''
}
