import { DEFAULT_SERVICE_TYPE } from './labels'
import type { ServiceType } from '../types'

export type RememberedService = {
  label: string
  lifespanWeeks: number
  serviceType: ServiceType
}

const STORAGE_KEY = 'salon-app-services'
const HYDRATED_KEY = 'salon-app-services-hydrated'

type ServiceSource = {
  service: string
  lifespanWeeks: number
  serviceType?: ServiceType
  updatedAt?: string
}

function normalizeKey(type: ServiceType, label: string) {
  return `${type}:${label.trim().toLowerCase()}`
}

function asServiceType(value: unknown): ServiceType {
  if (
    value === 'hair' ||
    value === 'nail' ||
    value === 'waxing' ||
    value === 'eyelash' ||
    value === 'massage' ||
    value === 'tanning' ||
    value === 'facials'
  ) {
    return value
  }
  return DEFAULT_SERVICE_TYPE
}

function readMap(): Record<string, RememberedService> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, RememberedService>
    if (!parsed || typeof parsed !== 'object') return {}
    const next: Record<string, RememberedService> = {}
    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry.label !== 'string') continue
      const type = asServiceType(entry.serviceType ?? key.split(':')[0])
      const label = entry.label.trim()
      if (!label) continue
      next[normalizeKey(type, label)] = {
        label,
        lifespanWeeks: entry.lifespanWeeks,
        serviceType: type,
      }
    }
    return next
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, RememberedService>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function readRememberedServices(
  type: ServiceType = DEFAULT_SERVICE_TYPE,
): RememberedService[] {
  return Object.values(readMap())
    .filter((entry) => entry.serviceType === type)
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    )
}

export function lookupRememberedLifespan(
  label: string,
  type: ServiceType = DEFAULT_SERVICE_TYPE,
): number | null {
  if (!label.trim()) return null
  const entry = readMap()[normalizeKey(type, label)]
  return entry?.lifespanWeeks ?? null
}

export function rememberService(
  label: string,
  lifespanWeeks: number,
  type: ServiceType = DEFAULT_SERVICE_TYPE,
) {
  const trimmed = label.trim()
  if (!trimmed) return
  const weeks = Number(lifespanWeeks)
  if (!Number.isFinite(weeks) || weeks < 1) return

  const map = readMap()
  map[normalizeKey(type, trimmed)] = {
    label: trimmed,
    lifespanWeeks: weeks,
    serviceType: type,
  }
  writeMap(map)
}

/** Fill empty memory once from clients already in the book. */
export function hydrateServiceMemoryFromClients(clients: ServiceSource[]) {
  if (localStorage.getItem(HYDRATED_KEY) === '1') return
  if (Object.keys(readMap()).length > 0) {
    localStorage.setItem(HYDRATED_KEY, '1')
    return
  }
  if (clients.length === 0) return

  const best = new Map<string, ServiceSource>()
  for (const client of clients) {
    const type = asServiceType(client.serviceType)
    const key = normalizeKey(type, client.service)
    if (!client.service.trim()) continue
    const existing = best.get(key)
    if (!existing || (client.updatedAt ?? '') > (existing.updatedAt ?? '')) {
      best.set(key, { ...client, serviceType: type })
    }
  }

  const map: Record<string, RememberedService> = {}
  for (const client of best.values()) {
    const trimmed = client.service.trim()
    const type = asServiceType(client.serviceType)
    map[normalizeKey(type, trimmed)] = {
      label: trimmed,
      lifespanWeeks: client.lifespanWeeks,
      serviceType: type,
    }
  }
  writeMap(map)
  localStorage.setItem(HYDRATED_KEY, '1')
}
