import { Redis } from '@upstash/redis'
import { randomUUID } from 'node:crypto'
import type { AdminAuditEntry, AdminSupportNote } from '../../src/lib/adminTypes.ts'

const SUPPORT_KEY = 'admin:support'
const AUDIT_KEY = 'admin:audit'
const MAX_ITEMS = 200

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  )
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
  const rows = (await redis().lrange<T>(key, 0, MAX_ITEMS - 1)) ?? []
  return Array.isArray(rows) ? rows : []
}

async function pushJson(key: string, value: unknown): Promise<void> {
  const client = redis()
  await client.lpush(key, value)
  await client.ltrim(key, 0, MAX_ITEMS - 1)
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
