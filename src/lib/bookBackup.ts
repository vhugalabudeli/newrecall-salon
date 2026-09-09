import { format } from 'date-fns'
import { listClients, replaceAllClients } from './db'
import {
  ensureTypesForClients,
  readCatalog,
  writeCatalog,
} from './serviceCatalog'
import { readSalonName, writeSalonName } from './settings'
import {
  buildBookBackup,
  parseBookBackup,
  type BookBackup,
} from './bookShape'

const LAST_EXPORT_KEY = 'salon-app-last-export-at'

export type { BookBackup }
export { parseBookBackup }

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

export async function exportBook(): Promise<void> {
  const backup = buildBookBackup({
    salonName: readSalonName(),
    clients: await listClients(),
    catalog: readCatalog(),
  })
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const stamp = format(new Date(backup.exportedAt), 'yyyy-MM-dd')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `newrecall-book-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
  writeLastExportAt(backup.exportedAt)
}

export async function importParsedBook(
  parsed: BookBackup,
): Promise<{ error?: string }> {
  await replaceAllClients(parsed.clients)
  if (parsed.salonName.trim()) {
    try {
      await writeSalonName(parsed.salonName)
    } catch {
      /* staff cannot rename; the book still imports */
    }
  }
  if (parsed.catalog) {
    await writeCatalog(parsed.catalog)
  } else {
    await ensureTypesForClients(parsed.clients)
  }
  return {}
}

export async function importBook(file: File): Promise<{ error?: string }> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text()) as unknown
  } catch {
    return { error: 'That file is not a valid NewRecall salon backup.' }
  }
  const parsed = parseBookBackup(raw)
  if ('error' in parsed) return parsed
  return importParsedBook(parsed)
}
