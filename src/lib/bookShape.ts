import { DEFAULT_MESSAGE_TEMPLATE } from './messageTemplate'
import { parseCatalog, type ServiceCatalog } from './catalogParse'
import type { Client } from '../types'

export const BACKUP_KIND = 'newrecall-salon-book'

export type BookBackup = {
  kind: typeof BACKUP_KIND
  version: 1
  exportedAt: string
  salonName: string
  messageTemplate: string
  clients: Client[]
  catalog?: ServiceCatalog
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
    return { error: 'That file is not a valid NewRecall salon backup.' }
  }
  const data = raw as Partial<BookBackup>
  if (data.kind !== BACKUP_KIND || data.version !== 1) {
    return { error: 'That file is not a valid NewRecall salon backup.' }
  }
  if (!Array.isArray(data.clients) || !data.clients.every(isClient)) {
    return { error: 'That backup file appears to be damaged.' }
  }
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt:
      typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    salonName: typeof data.salonName === 'string' ? data.salonName : '',
    messageTemplate:
      typeof data.messageTemplate === 'string'
        ? data.messageTemplate
        : DEFAULT_MESSAGE_TEMPLATE,
    clients: data.clients,
    catalog: parseCatalog(data.catalog) ?? undefined,
  }
}

export function buildBookBackup(input: {
  salonName: string
  clients: Client[]
  catalog?: ServiceCatalog
}): BookBackup {
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    salonName: input.salonName,
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    clients: input.clients,
    catalog: input.catalog,
  }
}
