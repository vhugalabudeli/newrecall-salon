import type { AlertPrefs } from './alertPrefs'

const DB_NAME = 'salon-recall-alerts'
const STORE = 'snapshot'
const KEY = 'current'
const DB_VERSION = 1

export type AlertPayload = {
  title: string
  body: string
  tag: string
}

export type AlertSnapshot = {
  prefs: AlertPrefs
  day: string
  dueToday: AlertPayload | null
  overdue: AlertPayload | null
  dueTodaySentDay: string | null
  overdueSentDay: string | null
  iconUrl: string
  openUrl: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function readAlertSnapshot(): Promise<AlertSnapshot | null> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onerror = () => reject(req.error ?? new Error('read failed'))
      req.onsuccess = () => resolve((req.result as AlertSnapshot | undefined) ?? null)
    })
  } finally {
    db.close()
  }
}

export async function writeAlertSnapshot(snapshot: AlertSnapshot): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('write failed'))
      tx.objectStore(STORE).put(snapshot, KEY)
    })
  } finally {
    db.close()
  }
}

export async function claimAlertSentDay(
  kind: 'dueToday' | 'overdue',
  day: string,
): Promise<boolean> {
  const current = await readAlertSnapshot()
  if (!current) return false
  const field = kind === 'dueToday' ? 'dueTodaySentDay' : 'overdueSentDay'
  if (current[field] === day) return false
  await writeAlertSnapshot({ ...current, [field]: day })
  return true
}

export async function clearAlertSentDay(
  kind: 'dueToday' | 'overdue',
): Promise<void> {
  const current = await readAlertSnapshot()
  if (!current) return
  const field = kind === 'dueToday' ? 'dueTodaySentDay' : 'overdueSentDay'
  await writeAlertSnapshot({ ...current, [field]: null })
}
