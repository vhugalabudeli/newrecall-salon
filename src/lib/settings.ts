import { getActiveSalon, isSalonOwner, setActiveSalon } from './salonSession'
import { supabase } from './supabase'

export const DEFAULT_SALON_NAME = 'Your salon'
export const SALON_NAME_CHANGED = 'salon-name-changed'

export function shopMarkLabel(salonName: string): string {
  return salonName
}

export function readSalonName(): string {
  return getActiveSalon()?.salonName?.trim() || DEFAULT_SALON_NAME
}

export async function writeSalonName(name: string): Promise<string> {
  const value = name.trim() || DEFAULT_SALON_NAME
  const salon = getActiveSalon()
  if (!salon || !isSalonOwner()) {
    window.dispatchEvent(new Event(SALON_NAME_CHANGED))
    return salon?.salonName || DEFAULT_SALON_NAME
  }
  const { error } = await supabase
    .from('salons')
    .update({ name: value, updated_at: new Date().toISOString() })
    .eq('id', salon.salonId)
  if (error) throw new Error(error.message || 'The salon name could not be updated. Try again.')
  setActiveSalon({ ...salon, salonName: value })
  window.dispatchEvent(new Event(SALON_NAME_CHANGED))
  return value
}
