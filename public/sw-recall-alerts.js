/* global self, indexedDB, clients */

const DB_NAME = 'salon-recall-alerts'
const STORE = 'snapshot'
const KEY = 'current'
const DB_VERSION = 1
const PERIODIC_TAG = 'recall-alerts'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error || new Error('open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

async function readSnapshot() {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onerror = () => reject(req.error || new Error('read failed'))
      req.onsuccess = () => resolve(req.result || null)
    })
  } finally {
    db.close()
  }
}

async function writeSnapshot(snapshot) {
  const db = await openDb()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('write failed'))
      tx.objectStore(STORE).put(snapshot, KEY)
    })
  } finally {
    db.close()
  }
}

function todayIso(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function claimSent(kind, day) {
  const current = await readSnapshot()
  if (!current) return { claimed: false, snapshot: null }
  const field = kind === 'dueToday' ? 'dueTodaySentDay' : 'overdueSentDay'
  if (current[field] === day) return { claimed: false, snapshot: current }
  const next = { ...current, [field]: day }
  await writeSnapshot(next)
  return { claimed: true, snapshot: next }
}

async function clearSent(kind) {
  const current = await readSnapshot()
  if (!current) return
  const field = kind === 'dueToday' ? 'dueTodaySentDay' : 'overdueSentDay'
  await writeSnapshot({ ...current, [field]: null })
}

async function showPayload(payload, iconUrl) {
  if (!payload) return
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: iconUrl,
    data: { url: '/app' },
  })
}

async function runRecallAlertCheck() {
  const snapshot = await readSnapshot()
  if (!snapshot) return
  const day = todayIso()
  const icon = snapshot.iconUrl || '/favicon.svg'

  if (snapshot.prefs && snapshot.prefs.dueToday && snapshot.dueToday) {
    const { claimed } = await claimSent('dueToday', day)
    if (claimed) {
      try {
        await showPayload(snapshot.dueToday, icon)
      } catch {
        await clearSent('dueToday')
      }
    }
  }

  if (snapshot.prefs && snapshot.prefs.overdue && snapshot.overdue) {
    const { claimed } = await claimSent('overdue', day)
    if (claimed) {
      try {
        await showPayload(snapshot.overdue, icon)
      } catch {
        await clearSent('overdue')
      }
    }
  }
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'NewRecall',
    body: 'You have recalls to follow up.',
    tag: 'salon-push',
    url: '/app',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        tag: parsed.tag || payload.tag,
        url: parsed.url || payload.url,
      }
    }
  } catch {
    try {
      const text = event.data && event.data.text()
      if (text) payload.body = text
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/favicon.svg',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target =
    (event.notification.data && event.notification.data.url) || '/app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(target).then((navigated) => navigated || client.focus())
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
      return undefined
    }),
  )
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== PERIODIC_TAG) return
  event.waitUntil(runRecallAlertCheck())
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'recall-alerts-check') return
  event.waitUntil(runRecallAlertCheck())
})
