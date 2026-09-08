import { BUILTIN_SERVICE_TYPES, DEFAULT_LIFESPAN_WEEKS } from './labels'
import {
  clampWeeks,
  parseCatalog,
  type CatalogService,
  type CatalogType,
  type ServiceCatalog,
} from './catalogParse'
import { requireSalonId } from './salonSession'
import { supabase } from './supabase'

export const CATALOG_CHANGED = 'service-catalog-changed'
export type { CatalogService, CatalogType, ServiceCatalog }
export { parseCatalog }

let cache: ServiceCatalog | null = null

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CATALOG_CHANGED))
  }
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

function titleCase(id: string): string {
  const builtin = BUILTIN_SERVICE_TYPES.find((type) => type.id === id)
  if (builtin) return builtin.name
  return (
    id
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || id
  )
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

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

async function persist(catalog: ServiceCatalog) {
  const salonId = requireSalonId()
  ensureGeneralOnCatalog(catalog)
  sortCatalog(catalog)

  const [{ data: existingTypes, error: typeErr }, { data: existingServices, error: serviceErr }] =
    await Promise.all([
      supabase.from('service_types').select('id').eq('salon_id', salonId),
      supabase.from('services').select('id').eq('salon_id', salonId),
    ])
  throwIf(typeErr, 'Could not load service types.')
  throwIf(serviceErr, 'Could not load services.')

  const nextTypeIds = new Set(catalog.types.map((type) => type.id))
  const nextServiceIds = new Set(
    catalog.types.flatMap((type) => type.services.map((service) => service.id)),
  )
  const typesToDelete = (existingTypes ?? [])
    .map((row) => row.id as string)
    .filter((id) => !nextTypeIds.has(id))
  if (typesToDelete.length > 0) {
    const { error } = await supabase
      .from('service_types')
      .delete()
      .eq('salon_id', salonId)
      .in('id', typesToDelete)
    throwIf(error, 'Could not update service types.')
  }

  const { error: upsertTypesError } = await supabase.from('service_types').upsert(
    catalog.types.map((type) => ({
      id: type.id,
      salon_id: salonId,
      name: type.name,
    })),
    { onConflict: 'salon_id,id' },
  )
  throwIf(upsertTypesError, 'Could not save service types.')

  const servicesToDelete = (existingServices ?? [])
    .map((row) => row.id as string)
    .filter((id) => !nextServiceIds.has(id))
  if (servicesToDelete.length > 0) {
    const { error } = await supabase.from('services').delete().in('id', servicesToDelete)
    throwIf(error, 'Could not update services.')
  }

  const rows = catalog.types.flatMap((type) =>
    type.services.map((service) => ({
      id: service.id,
      salon_id: salonId,
      type_id: type.id,
      name: service.name,
      lifespan_weeks: service.lifespanWeeks,
    })),
  )
  if (rows.length > 0) {
    const { error: upsertServicesError } = await supabase.from('services').upsert(rows)
    throwIf(upsertServicesError, 'Could not save services.')
  }

  cache = structuredClone(catalog)
  notify()
}

export function readCatalog(): ServiceCatalog {
  if (cache) return structuredClone(cache)
  return seedCatalog()
}

export async function loadCatalog(salonId: string): Promise<ServiceCatalog> {
  const [{ data: types, error: typeErr }, { data: services, error: serviceErr }] =
    await Promise.all([
      supabase.from('service_types').select('id, name').eq('salon_id', salonId),
      supabase
        .from('services')
        .select('id, type_id, name, lifespan_weeks')
        .eq('salon_id', salonId),
    ])
  throwIf(typeErr, 'Could not load service types.')
  throwIf(serviceErr, 'Could not load services.')
  const catalog: ServiceCatalog = {
    types: (types ?? []).map((type) => ({
      id: type.id as string,
      name: type.name as string,
      services: (services ?? [])
        .filter((service) => service.type_id === type.id)
        .map((service) => ({
          id: service.id as string,
          name: service.name as string,
          lifespanWeeks: clampWeeks(service.lifespan_weeks),
        })),
    })),
  }
  if (catalog.types.length === 0) {
    cache = seedCatalog()
    notify()
    return structuredClone(cache)
  }
  ensureGeneralOnCatalog(catalog)
  sortCatalog(catalog)
  cache = catalog
  notify()
  return structuredClone(cache)
}

export async function writeCatalog(catalog: ServiceCatalog) {
  await persist(structuredClone(catalog))
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

export async function addServiceType(
  name: string,
): Promise<CatalogType | { error: string }> {
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
  await persist(catalog)
  return type
}

export async function renameServiceType(
  id: string,
  name: string,
): Promise<{ error?: string }> {
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
  await persist(catalog)
  return {}
}

export async function deleteServiceType(id: string): Promise<{ error?: string }> {
  const catalog = readCatalog()
  if (!catalog.types.some((type) => type.id === id)) {
    return { error: 'That service type is gone.' }
  }
  catalog.types = catalog.types.filter((type) => type.id !== id)
  await persist(catalog)
  return {}
}

export async function addService(
  typeId: string,
  name: string,
  lifespanWeeks: number,
): Promise<CatalogService | { error: string }> {
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
  await persist(catalog)
  return service
}

export async function updateService(
  typeId: string,
  serviceId: string,
  patch: { name?: string; lifespanWeeks?: number },
): Promise<{ error?: string }> {
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
  await persist(catalog)
  return {}
}

export async function deleteService(
  typeId: string,
  serviceId: string,
): Promise<{ error?: string }> {
  const catalog = readCatalog()
  const type = catalog.types.find((item) => item.id === typeId)
  if (!type) return { error: 'That service type is gone.' }
  const service = type.services.find((item) => item.id === serviceId)
  if (!service) return { error: 'That service is gone.' }
  if (isGeneralService(service)) {
    return { error: 'General stays on every type.' }
  }
  type.services = type.services.filter((item) => item.id !== serviceId)
  await persist(catalog)
  return {}
}

export async function rememberCatalogService(
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
  await persist(catalog)
}

export async function ensureTypesForClients(
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
  if (changed) await persist(catalog)
}
