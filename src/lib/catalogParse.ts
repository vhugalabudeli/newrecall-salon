import type { ServiceType } from '../types'
import { DEFAULT_LIFESPAN } from './labels'

export type CatalogService = {
  id: string
  name: string
  lifespan: number
}

export type CatalogType = {
  id: ServiceType
  name: string
  services: CatalogService[]
}

export type ServiceCatalog = {
  types: CatalogType[]
}

export function clampWeeks(value: unknown): number {
  const weeks = Number(value)
  if (!Number.isFinite(weeks)) return DEFAULT_LIFESPAN
  return Math.min(16, Math.max(2, Math.round(weeks)))
}

function readLifespan(value: { lifespan?: unknown; lifespanWeeks?: unknown }): number {
  if (value.lifespan != null) return clampWeeks(value.lifespan)
  return clampWeeks(value.lifespanWeeks)
}

function isService(value: unknown): value is CatalogService {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<CatalogService> & { lifespanWeeks?: unknown }
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
        lifespan: readLifespan(
          service as CatalogService & { lifespanWeeks?: unknown },
        ),
      })),
    })),
  }
}
