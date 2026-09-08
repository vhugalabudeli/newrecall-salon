import type { ServiceType } from '../types'
import { DEFAULT_LIFESPAN_WEEKS } from './labels'

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

export function clampWeeks(value: unknown): number {
  const weeks = Number(value)
  if (!Number.isFinite(weeks)) return DEFAULT_LIFESPAN_WEEKS
  return Math.min(16, Math.max(2, Math.round(weeks)))
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
