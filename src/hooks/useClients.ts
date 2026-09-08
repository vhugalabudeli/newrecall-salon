import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { sortByRecall } from '../lib/schedule'
import type { Client } from '../types'

export function useClients(): {
  clients: Client[]
  ready: boolean
} {
  const records = useLiveQuery(() => db.clients.toArray())

  if (!records) {
    return { clients: [], ready: false }
  }

  return {
    clients: sortByRecall(records),
    ready: true,
  }
}
