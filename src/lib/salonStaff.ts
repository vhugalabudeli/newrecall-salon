import { accessToken, loadAuthUser, type AuthUser, type SalonRole } from './auth'
import { getActiveSalon } from './salonSession'
import { supabase } from './supabase'

export type { SalonRole }

export type SalonMemberRow = {
  userId: string
  email: string
  name: string
  role: SalonRole
}

export type SalonInviteRow = {
  id: string
  email: string
  createdAt: string
  expiresAt: string
}

export async function listSalonMembers(): Promise<SalonMemberRow[]> {
  const salon = getActiveSalon()
  if (!salon) return []
  const { data, error } = await supabase
    .from('salon_members')
    .select('user_id, role, profiles ( name, email )')
    .eq('salon_id', salon.salonId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { name?: string; email?: string }
      | { name?: string; email?: string }[]
      | null
    const info = Array.isArray(profile) ? profile[0] : profile
    return {
      userId: row.user_id as string,
      role: row.role as SalonRole,
      name: info?.name?.trim() || 'Staff',
      email: info?.email?.trim().toLowerCase() || '',
    }
  })
}

export async function listOpenInvites(): Promise<SalonInviteRow[]> {
  const salon = getActiveSalon()
  if (!salon) return []
  const { data, error } = await supabase
    .from('salon_invites')
    .select('id, email, created_at, expires_at, accepted_at')
    .eq('salon_id', salon.salonId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: String(row.email),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  }))
}

export async function inviteStaff(email: string): Promise<{ error?: string }> {
  const token = await accessToken()
  if (!token) return { error: 'Sign in required.' }
  const res = await fetch('/api/salon/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'Could not send the invite.'
    return { error }
  }
  return {}
}

export async function cancelInvite(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('salon_invites').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function removeStaff(userId: string): Promise<{ error?: string }> {
  const salon = getActiveSalon()
  if (!salon) return { error: 'You are not in a salon.' }
  const { error } = await supabase
    .from('salon_members')
    .delete()
    .eq('salon_id', salon.salonId)
    .eq('user_id', userId)
    .eq('role', 'staff')
  if (error) return { error: error.message }
  return {}
}

export async function refreshAuthUser(): Promise<AuthUser | null> {
  return loadAuthUser()
}
