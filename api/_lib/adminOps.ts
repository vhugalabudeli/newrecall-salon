import { Redis } from '@upstash/redis'
import { createHash, randomUUID } from 'node:crypto'
import type { AdminAuditEntry, AdminSupportNote } from '../../src/lib/adminTypes.js'

const SUPPORT_KEY = 'admin:support'
const AUDIT_KEY = 'admin:audit'
const MAX_ITEMS = 200
const OPERATIONS_RETENTION_DAYS = 365
const OPERATIONS_RETENTION_SECONDS = OPERATIONS_RETENTION_DAYS * 24 * 60 * 60
const LOGIN_WINDOW_SECONDS = 15 * 60
const LOGIN_ATTEMPT_LIMIT = 5

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  )
}

function loginKey(identity: string): string {
  const digest = createHash('sha256').update(identity).digest('hex')
  return `admin:login:${digest}`
}

export async function assertAdminLoginAllowed(identity: string): Promise<void> {
  if (!redisConfigured()) throw new Error('Admin login protection is not configured.')
  const attempts = Number((await redis().get<number>(loginKey(identity))) ?? 0)
  if (attempts >= LOGIN_ATTEMPT_LIMIT) {
    throw new Error('Too many sign-in attempts. Try again in 15 minutes.')
  }
}

export async function recordAdminLoginFailure(identity: string): Promise<void> {
  const client = redis()
  const key = loginKey(identity)
  const attempts = await client.incr(key)
  if (attempts === 1) await client.expire(key, LOGIN_WINDOW_SECONDS)
}

export async function clearAdminLoginFailures(identity: string): Promise<void> {
  await redis().del(loginKey(identity))
}

function redis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
  })
}

export async function redisHealth(): Promise<{
  available: boolean
  storageHealthy: boolean | null
}> {
  if (!redisConfigured()) {
    return { available: false, storageHealthy: null }
  }
  try {
    const pong = await redis().ping()
    return { available: true, storageHealthy: pong === 'PONG' || pong === 'pong' || Boolean(pong) }
  } catch {
    return { available: true, storageHealthy: false }
  }
}

async function listJson<T>(key: string): Promise<T[]> {
  if (!redisConfigured()) return []
  const client = redis()
  const rows = (await client.lrange<T>(key, 0, MAX_ITEMS - 1)) ?? []
  if (!Array.isArray(rows)) return []
  const cutoff = Date.now() - OPERATIONS_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const fresh = rows.filter((row) => {
    if (!row || typeof row !== 'object') return false
    const value = row as { createdAt?: string; at?: string }
    const timestamp = Date.parse(value.createdAt || value.at || '')
    return Number.isFinite(timestamp) && timestamp >= cutoff
  })
  if (fresh.length !== rows.length) {
    await client.del(key)
    if (fresh.length) {
      await client.rpush(key, ...fresh)
      await client.expire(key, OPERATIONS_RETENTION_SECONDS)
    }
  }
  return fresh
}

async function pushJson(key: string, value: unknown): Promise<void> {
  const client = redis()
  await client.lpush(key, value)
  await client.ltrim(key, 0, MAX_ITEMS - 1)
  await client.expire(key, OPERATIONS_RETENTION_SECONDS)
}

export async function listSupportNotes(): Promise<AdminSupportNote[]> {
  return listJson<AdminSupportNote>(SUPPORT_KEY)
}

export async function listAudit(): Promise<AdminAuditEntry[]> {
  return listJson<AdminAuditEntry>(AUDIT_KEY)
}

export async function addSupportNote(input: {
  operatorEmail: string
  kind: 'book_locked' | 'billing'
  email: string
  note: string
}): Promise<AdminSupportNote | null> {
  if (!redisConfigured()) return null
  const row: AdminSupportNote = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    operatorEmail: input.operatorEmail,
    kind: input.kind,
    email: input.email.trim().toLowerCase(),
    note: input.note.trim(),
  }
  try {
    await pushJson(SUPPORT_KEY, row)
    return row
  } catch {
    return null
  }
}

export async function addAudit(input: {
  operatorEmail: string
  action: string
  detail: string
}): Promise<void> {
  if (!redisConfigured()) return
  const row: AdminAuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    operatorEmail: input.operatorEmail,
    action: input.action,
    detail: input.detail,
  }
  try {
    await pushJson(AUDIT_KEY, row)
  } catch {
    // Desk stays usable if Redis is down.
  }
}
