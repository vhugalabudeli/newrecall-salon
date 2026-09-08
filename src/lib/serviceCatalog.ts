import type { ServiceType } from '../types'
import {
  BUILTIN_SERVICE_TYPES,
  DEFAULT_LIFESPAN_WEEKS,
  DEFAULT_SERVICE_TYPE,
} from './labels'

export const CATALOG_CHANGED = 'service-catalog-changed'

const STORAGE_KEY = 'salon-app-service-catalog'
const LEGACY_MEMORY_KEY = 'salon-app-services'

export type CatalogService = {
  id: string
  name: string
  lifespanWeeks: number
}

export type CatalogType = {
  id: ServiceType
  name: string
  services: CatalogService[]
}

export type ServiceCatalog = {
  types: CatalogType[]
}

type LegacyRemembered = {
  label: string
  lifespanWeeks: number
  serviceType?: string
}

function notify() {
  window.dispatchEvent(new Event(CATALOG_CHANGED))
}

function clampWeeks(value: unknown): number {
  const weeks = Number(value)
  if (!Number.isFinite(weeks)) return DEFAULT_LIFESPAN_WEEKS
  return Math.min(16, Math.max(2, Math.round(weeks)))
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'type'
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export const GENERAL_SERVICE_NAME = 'General'

export function isGeneralService(service: { name: string }) {
  return sameName(service.name, GENERAL_SERVICE_NAME)
}

function generalService(): CatalogService {
  return {
    id: crypto.randomUUID(),
    name: GENERAL_SERVICE_NAME,
    lifespanWeeks: DEFAULT_LIFESPAN_WEEKS,
  }
}

function ensureGeneralOnType(type: CatalogType): boolean {
  if (type.services.some(isGeneralService)) return false
  type.services.unshift(generalService())
  return true
}

function ensureGeneralOnCatalog(catalog: ServiceCatalog): boolean {
  let changed = false
  for (const type of catalog.types) {
    if (ensureGeneralOnType(type)) changed = true
  }
  return changed
}

function seedCatalog(): ServiceCatalog {
  return {
    types: BUILTIN_SERVICE_TYPES.map((type) => ({
      id: type.id,
      name: type.name,
      services: [generalService()],
    })),
  }
}

function isService(value: unknown): value is CatalogService {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<CatalogService>
  return typeof row.id === 'string' && typeof row.name === 'string'
}

function isType(value: unknown): value is CatalogType {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<CatalogType>
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    Array.isArray(row.services) &&
    row.services.every(isService)
  )
}

export function parseCatalog(raw: unknown): ServiceCatalog | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<ServiceCatalog>
  if (!Array.isArray(data.types) || !data.types.every(isType)) return null
  return {
    types: data.types.map((type) => ({
      id: type.id,
      name: type.name.trim() || type.id,
      services: type.services.map((service) => ({
        id: service.id,
        name: service.name.trim(),
        lifespanWeeks: clampWeeks(service.lifespanWeeks),
      })),
    })),
  }
}

function importLegacyMemory(catalog: ServiceCatalog): ServiceCatalog {
  try {
    const raw = localStorage.getItem(LEGACY_MEMORY_KEY)
    if (!raw) return catalog
    const parsed = JSON.parse(raw) as Record<string, LegacyRemembered>
    if (!parsed || typeof parsed !== 'object') return catalog
    const next = structuredClone(catalog)
    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry.label !== 'string') continue
      const name = entry.label.trim()
      if (!name) continue
      const typeId =
        (typeof entry.serviceType === 'string' && entry.serviceType) ||
        key.split(':')[0] ||
        DEFAULT_SERVICE_TYPE
      let type = next.types.find((item) => item.id === typeId)
      if (!type) {
        type = { id: typeId, name: titleCase(typeId), services: [] }
        next.types.push(type)
      }
      if (type.services.some((service) => sameName(service.name, name))) continue
      type.services.push({
        id: crypto.randomUUID(),
        name,
        lifespanWeeks: clampWeeks(entry.lifespanWeeks),
      })
    }
    sortCatalog(next)
    return next
  } catch {
    return catalog
  }
}

function titleCase(id: string): string {
  const builtin = BUILTIN_SERVICE_TYPES.find((type) => type.id === id)
  if (builtin) return builtin.name
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || id
}

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function sortCatalog(catalog: ServiceCatalog) {
  catalog.types.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
  for (const type of catalog.types) {
    type.services.sort((a, b) => {
      const aGeneral = isGeneralService(a)
      const bGeneral = isGeneralService(b)
      if (aGeneral && !bGeneral) return -1
      if (!aGeneral && bGeneral) return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }
}

function persist(catalog: ServiceCatalog) {
  ensureGeneralOnCatalog(catalog)
  sortCatalog(catalog)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
  notify()
}

export function readCatalog(): ServiceCatalog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = parseCatalog(JSON.parse(raw) as unknown)
      if (parsed) {
        if (ensureGeneralOnCatalog(parsed)) persist(parsed)
        return parsed
      }
    }
  } catch {
    /* seed below */
  }
  const seeded = importLegacyMemory(seedCatalog())
  persist(seeded)
  return seeded
}

export function writeCatalog(catalog: ServiceCatalog) {
  persist(catalog)
}

export function catalogTypes(): CatalogType[] {
  return readCatalog().types
}

export function catalogType(id: string): CatalogType | null {
  return readCatalog().types.find((type) => type.id === id) ?? null
}

export function serviceTypeLabel(id: string): string {
  return catalogType(id)?.name ?? titleCase(id)
}

export function servicesForType(id: string): CatalogService[] {
  return catalogType(id)?.services ?? []
}

export function addServiceType(name: string): CatalogType | { error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a service type.' }
  const catalog = readCatalog()
  if (catalog.types.some((type) => sameName(type.name, trimmed))) {
    return { error: 'That service type is already in the list.' }
  }
  const type: CatalogType = {
    id: uniqueId(
      slugify(trimmed),
      new Set(catalog.types.map((item) => item.id)),
    ),
    name: trimmed,
    services: [generalService()],
  }
  catalog.types.push(type)
  persist(catalog)
  return type
}

export function renameServiceType(
  id: string,
  name: string,
): { error?: string } {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a service type.' }
  const catalog = readCatalog()
  const type = catalog.types.find((item) => item.id === id)
  if (!type) return { error: 'That service type is gone.' }
  if (
    catalog.types.some(
      (item) => item.id !== id && sameName(item.name, trimmed),
    )
  ) {
    return { error: 'That service type is already in the list.' }
  }
  type.name = trimmed
  persist(catalog)
  return {}
}

export function deleteServiceType(id: string): { error?: string } {
  const catalog = readCatalog()
  if (!catalog.types.some((type) => type.id === id)) {
    return { error: 'That service type is gone.' }
  }
  catalog.types = catalog.types.filter((type) => type.id !== id)
  persist(catalog)
  return {}
}

export function addService(
  typeId: string,
  name: string,
  lifespanWeeks: number,
): CatalogService | { error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a service.' }
  const catalog = readCatalog()
  const type = catalog.types.find((item) => item.id === typeId)
  if (!type) return { error: 'Pick a service type first.' }
  if (type.services.some((service) => sameName(service.name, trimmed))) {
    return { error: 'That service is already in this type.' }
  }
  const service: CatalogService = {
    id: crypto.randomUUID(),
    name: trimmed,
    lifespanWeeks: clampWeeks(lifespanWeeks),
  }
  type.services.push(service)
  persist(catalog)
  return service
}

export function updateService(
  typeId: string,
  serviceId: string,
  patch: { name?: string; lifespanWeeks?: number },
): { error?: string } {
  const catalog = readCatalog()
  const type = catalog.types.find((item) => item.id === typeId)
  const service = type?.services.find((item) => item.id === serviceId)
  if (!type || !service) return { error: 'That service is gone.' }
  if (isGeneralService(service) && patch.name != null) {
    const trimmed = patch.name.trim()
    if (!sameName(trimmed, GENERAL_SERVICE_NAME)) {
      return { error: 'General keeps its name.' }
    }
  }
  if (patch.name != null) {
    const trimmed = patch.name.trim()
    if (!trimmed) return { error: 'Enter a service.' }
    if (
      type.services.some(
        (item) => item.id !== serviceId && sameName(item.name, trimmed),
      )
    ) {
      return { error: 'That service is already in this type.' }
    }
    service.name = trimmed
  }
  if (patch.lifespanWeeks != null) {
    service.lifespanWeeks = clampWeeks(patch.lifespanWeeks)
  }
  persist(catalog)
  return {}
}

export function deleteService(
  typeId: string,
  serviceId: string,
): { error?: string } {
  const catalog = readCatalog()
  const type = catalog.types.find((item) => item.id === typeId)
  if (!type) return { error: 'That service type is gone.' }
  const service = type.services.find((item) => item.id === serviceId)
  if (!service) return { error: 'That service is gone.' }
  if (isGeneralService(service)) {
    return { error: 'General stays on every type.' }
  }
  type.services = type.services.filter((item) => item.id !== serviceId)
  persist(catalog)
  return {}
}

export function rememberCatalogService(
  typeId: string,
  name: string,
  lifespanWeeks: number,
) {
  const trimmed = name.trim()
  if (!trimmed) return
  const catalog = readCatalog()
  let type = catalog.types.find((item) => item.id === typeId)
  if (!type) {
    type = { id: typeId, name: titleCase(typeId), services: [] }
    catalog.types.push(type)
  }
  const existing = type.services.find((service) =>
    sameName(service.name, trimmed),
  )
  if (existing) {
    existing.lifespanWeeks = clampWeeks(lifespanWeeks)
    existing.name = trimmed
  } else {
    type.services.push({
      id: crypto.randomUUID(),
      name: trimmed,
      lifespanWeeks: clampWeeks(lifespanWeeks),
    })
  }
  persist(catalog)
}

export function ensureTypesForClients(
  clients: { serviceType?: string }[],
) {
  const catalog = readCatalog()
  let changed = false
  for (const client of clients) {
    const typeId = client.serviceType?.trim()
    if (!typeId) continue
    if (catalog.types.some((item) => item.id === typeId)) continue
    catalog.types.push({
      id: typeId,
      name: titleCase(typeId),
      services: [],
    })
    changed = true
  }
  if (changed) persist(catalog)
}
