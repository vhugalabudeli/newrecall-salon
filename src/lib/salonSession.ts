export type SalonRole = 'owner' | 'staff'

export type ActiveSalon = {
  salonId: string
  salonName: string
  role: SalonRole
  billingEmail: string | null
}

let active: ActiveSalon | null = null

export function getActiveSalon(): ActiveSalon | null {
  return active
}

export function setActiveSalon(next: ActiveSalon | null) {
  active = next
}

export function requireSalonId(): string {
  if (!active?.salonId) {
    throw new Error('You are not in a salon.')
  }
  return active.salonId
}

export function isSalonOwner(): boolean {
  return active?.role === 'owner'
}
