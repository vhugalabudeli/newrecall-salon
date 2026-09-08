import type { Client } from '../types'
import { parseCatalog, type ServiceCatalog } from './catalogParse'
import { DEFAULT_SALON_NAME } from './settings'

const LEGACY_DB = 'NewRecallSalon'
const LEGACY_STORE = 'clients'
const LEGACY_SALON_NAME_KEY = 'salon-app-salon-name'
const LEGACY_CATALOG_KEY = 'salon-app-service-catalog'

function openLegacy(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(LEGACY_DB)
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function readLegacyDeviceClients(): Promise<Client[]> {
  const db = await openLegacy()
  if (!db) return []
  if (!db.objectStoreNames.contains(LEGACY_STORE)) {
    db.close()
    return []
  }
  return new Promise((resolve) => {
    const tx = db.transaction(LEGACY_STORE, 'readonly')
    const request = tx.objectStore(LEGACY_STORE).getAll()
    request.onerror = () => {
      db.close()
      resolve([])
    }
    request.onsuccess = () => {
      db.close()
      resolve((request.result as Client[]) ?? [])
    }
  })
}

export function readLegacySalonName(): string {
  try {
    return localStorage.getItem(LEGACY_SALON_NAME_KEY)?.trim() || DEFAULT_SALON_NAME
  } catch {
    return DEFAULT_SALON_NAME
  }
}

export function readLegacyCatalog(): ServiceCatalog | null {
  try {
    const raw = localStorage.getItem(LEGACY_CATALOG_KEY)
    if (!raw) return null
    return parseCatalog(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}
