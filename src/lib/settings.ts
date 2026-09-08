export const DEFAULT_SALON_NAME = 'Your salon'

const SALON_NAME_KEY = 'salon-app-salon-name'

export function shopMarkLabel(salonName: string): string {
  return salonName
}

export function readSalonName(): string {
  const stored = localStorage.getItem(SALON_NAME_KEY)?.trim()
  if (!stored) {
    return DEFAULT_SALON_NAME
  }
  return stored
}

export function writeSalonName(name: string): string {
  const value = name.trim() || DEFAULT_SALON_NAME
  localStorage.setItem(SALON_NAME_KEY, value)
  window.dispatchEvent(new Event('salon-name-changed'))
  return value
}
