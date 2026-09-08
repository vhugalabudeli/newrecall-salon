import { format } from 'date-fns'
import { db, replaceAllClients } from './db'
import {
  parseCatalog,
  readCatalog,
  writeCatalog,
  type ServiceCatalog,
} from './serviceCatalog'
import { readSalonName, writeSalonName } from './settings'
import { DEFAULT_MESSAGE_TEMPLATE } from './messageTemplate'
import type { Client } from '../types'

const LAST_EXPORT_KEY = 'salon-app-last-export-at'
const BACKUP_KIND = 'newrecall-salon-book'

export type BookBackup = {
  kind: typeof BACKUP_KIND
  version: 1
  exportedAt: string
  salonName: string
  messageTemplate: string
  clients: Client[]
  catalog?: ServiceCatalog
}

export function readLastExportAt(): string | null {
  return localStorage.getItem(LAST_EXPORT_KEY)
}

function writeLastExportAt(iso: string) {
  localStorage.setItem(LAST_EXPORT_KEY, iso)
}

export function lastExportLabel(iso: string | null): string {
  if (!iso) return 'Never exported'
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return 'Never exported'
  return format(at, 'd MMM yyyy, HH:mm')
}

function isClient(value: unknown): value is Client {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Client>
  return (
    typeof row.id === 'string' &&
    typeof row.clientName === 'string' &&
    typeof row.guestName === 'string' &&
    typeof row.lastVisitDate === 'string' &&
    Array.isArray(row.notes)
  )
}

export function parseBookBackup(raw: unknown): BookBackup | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'That file is not a NewRecall book.' }
  }
  const data = raw as Partial<BookBackup>
  if (data.kind !== BACKUP_KIND || data.version !== 1) {
    return { error: 'That file is not a NewRecall book.' }
  }
  if (!Array.isArray(data.clients) || !data.clients.every(isClient)) {
    return { error: 'That book file is damaged.' }
  }
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt:
      typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    salonName:
      typeof data.salonName === 'string' ? data.salonName : readSalonName(),
    messageTemplate:
      typeof data.messageTemplate === 'string'
        ? data.messageTemplate
        : DEFAULT_MESSAGE_TEMPLATE,
    clients: data.clients,
    catalog: parseCatalog(data.catalog) ?? undefined,
  }
}

export async function exportBook(): Promise<void> {
  const exportedAt = new Date().toISOString()
  const backup: BookBackup = {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt,
    salonName: readSalonName(),
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    clients: await db.clients.toArray(),
    catalog: readCatalog(),
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const stamp = format(new Date(exportedAt), 'yyyy-MM-dd')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `newrecall-book-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
  writeLastExportAt(exportedAt)
}

export async function importBook(file: File): Promise<{ error?: string }> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text()) as unknown
  } catch {
    return { error: 'That file is not a NewRecall book.' }
  }
  const parsed = parseBookBackup(raw)
  if ('error' in parsed) return parsed
  await replaceAllClients(parsed.clients)
  writeSalonName(parsed.salonName)
  if (parsed.catalog) writeCatalog(parsed.catalog)
  return {}
}
