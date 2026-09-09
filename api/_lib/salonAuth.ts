import { supabaseAdmin, userFromBearer } from './supabaseAdmin.js'

export type SalonRole = 'owner' | 'staff'

export type SalonActor = {
  userId: string
  email: string
  salonId: string
  salonName: string
  role: SalonRole
  billingEmail: string | null
}

type MemberJoin = {
  salon_id: string
  role: SalonRole
  salons:
    | { id: string; name: string; billing_email: string | null }
    | { id: string; name: string; billing_email: string | null }[]
    | null
}

function salonFromJoin(row: MemberJoin) {
  const salon = Array.isArray(row.salons) ? row.salons[0] : row.salons
  if (!salon) return null
  return {
    salonId: row.salon_id,
    salonName: salon.name,
    role: row.role,
    billingEmail: salon.billing_email,
  }
}

export async function actorFromRequest(
  authHeader: string | undefined,
): Promise<SalonActor> {
  const user = await userFromBearer(authHeader)
  const email = user.email?.trim().toLowerCase()
  if (!email) throw new Error('Sign in required.')
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('salon_members')
    .select('salon_id, role, salons ( id, name, billing_email )')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You are not in a salon.')
  const salon = salonFromJoin(data as MemberJoin)
  if (!salon) throw new Error('You are not in a salon.')
  return {
    userId: user.id,
    email,
    ...salon,
  }
}

export async function requireOwner(
  authHeader: string | undefined,
): Promise<SalonActor> {
  const actor = await actorFromRequest(authHeader)
  if (actor.role !== 'owner') {
    throw new Error('The owner needs to start the trial.')
  }
  return actor
}

export async function ownerEmailForSalon(salonId: string): Promise<string | null> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('salon_members')
    .select('user_id, profiles ( email )')
    .eq('salon_id', salonId)
    .eq('role', 'owner')
    .maybeSingle()
  if (error || !data) return null
  const profile = data.profiles as
    | { email?: string }
    | { email?: string }[]
    | null
  const row = Array.isArray(profile) ? profile[0] : profile
  const email = row?.email?.trim().toLowerCase()
  if (email) return email
  const { data: userData } = await admin.auth.admin.getUserById(data.user_id)
  return userData.user?.email?.trim().toLowerCase() ?? null
}

export async function billingEmailForSalon(
  actor: Pick<SalonActor, 'salonId' | 'billingEmail' | 'email' | 'role'>,
): Promise<string> {
  if (actor.billingEmail?.trim()) return actor.billingEmail.trim().toLowerCase()
  if (actor.role === 'owner') return actor.email
  return (await ownerEmailForSalon(actor.salonId)) || actor.email
}
