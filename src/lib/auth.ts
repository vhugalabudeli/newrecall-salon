import { loadCatalog } from './serviceCatalog'
import { setActiveSalon, type SalonRole } from './salonSession'
import { requireSupabaseConfig, supabase } from './supabase'

export type { SalonRole }

export type AuthUser = {
  id: string
  name: string
  email: string
  salonId: string
  salonName: string
  role: SalonRole
  billingEmail: string | null
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string }

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

async function fetchMembership(userId: string) {
  const { data, error } = await supabase
    .from('salon_members')
    .select('salon_id, role, salons ( id, name, billing_email )')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as MemberJoin | null
}

async function waitForMembership(userId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const row = await fetchMembership(userId)
    if (row) return row
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }
  return null
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  requireSupabaseConfig()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionUser = session?.user
  if (!sessionUser?.email) {
    setActiveSalon(null)
    return null
  }

  const [{ data: profile }, member] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', sessionUser.id).maybeSingle(),
    waitForMembership(sessionUser.id),
  ])

  if (!member) {
    setActiveSalon(null)
    return null
  }

  const salon = salonFromJoin(member)
  if (!salon) {
    setActiveSalon(null)
    return null
  }

  setActiveSalon(salon)
  await loadCatalog(salon.salonId)

  const name =
    (typeof profile?.name === 'string' && profile.name.trim()) ||
    (typeof sessionUser.user_metadata?.name === 'string' &&
      sessionUser.user_metadata.name.trim()) ||
    sessionUser.email.split('@')[0]

  return {
    id: sessionUser.id,
    name,
    email: sessionUser.email,
    salonId: salon.salonId,
    salonName: salon.salonName,
    role: salon.role,
    billingEmail: salon.billingEmail,
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  salonName: string,
): Promise<AuthResult> {
  try {
    requireSupabaseConfig()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedSalon = salonName.trim()
    if (!trimmedName) return { ok: false, error: 'Enter your name.' }
    if (!trimmedEmail.includes('@')) return { ok: false, error: 'Enter a valid email.' }
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters for the password.' }
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          salon_name: trimmedSalon || 'Your salon',
        },
      },
    })
    if (error) return { ok: false, error: error.message }
    if (!data.session) {
      return {
        ok: false,
        error:
          'Check your email to confirm the account, then log in. If confirmations are off, try logging in now.',
      }
    }

    const user = await loadAuthUser()
    if (!user) return { ok: false, error: 'Account created, but the salon is not ready yet. Log in again.' }
    return { ok: true, user }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not register.',
    }
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    requireSupabaseConfig()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) return { ok: false, error: error.message }
    const user = await loadAuthUser()
    if (!user) return { ok: false, error: 'Signed in, but this login is not attached to a salon.' }
    return { ok: true, user }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not log in.',
    }
  }
}

export async function logout() {
  await supabase.auth.signOut()
  setActiveSalon(null)
}

export async function accessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function registerAccount(input: {
  name: string
  email: string
  password: string
  salonName: string
}): Promise<AuthResult> {
  return register(input.name, input.email, input.password, input.salonName)
}

export function loginAccount(input: {
  email: string
  password: string
}): Promise<AuthResult> {
  return login(input.email, input.password)
}

export async function logoutTo(path: string) {
  await logout()
  window.location.assign(path)
}
