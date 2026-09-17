import { isReferrerKind, sanitizePromoCode, type ReferrerKind } from './promoCode'
import { paths } from './routes'
import { loadCatalog } from './serviceCatalog'
import { setActiveSalon, type SalonRole } from './salonSession'
import { requireSupabaseConfig, supabase } from './supabase'

export type { SalonRole, ReferrerKind }

export type AuthUser = {
  id: string
  name: string
  email: string
  salonId: string
  salonName: string
  role: SalonRole
  billingEmail: string | null
  welcomeCompletedAt: string | null
}

export type ReferrerUser = {
  id: string
  name: string
  email: string
  kind: ReferrerKind
  code: string | null
}

export type SessionIdentity =
  | { type: 'salon'; user: AuthUser }
  | { type: 'referrer'; referrer: ReferrerUser }

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string }

export type SignInResult =
  | { ok: true; identity: SessionIdentity }
  | { ok: false; error: string }

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

export async function loadIdentity(): Promise<SessionIdentity | null> {
  requireSupabaseConfig()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionUser = session?.user
  if (!sessionUser?.email) {
    setActiveSalon(null)
    return null
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const [{ data: profile }, member, { data: promo }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, welcome_completed_at, referrer_kind')
        .eq('id', sessionUser.id)
        .maybeSingle(),
      fetchMembership(sessionUser.id),
      supabase
        .from('promo_codes')
        .select('code, kind')
        .eq('owner_user_id', sessionUser.id)
        .maybeSingle(),
    ])

    const promoKind = typeof promo?.kind === 'string' ? promo.kind : null
    const kind = isReferrerKind(profile?.referrer_kind)
      ? profile.referrer_kind
      : isReferrerKind(promoKind)
        ? promoKind
        : null

    if (kind) {
      setActiveSalon(null)
      const name =
        (typeof profile?.name === 'string' && profile.name.trim()) ||
        (typeof sessionUser.user_metadata?.name === 'string' &&
          sessionUser.user_metadata.name.trim()) ||
        sessionUser.email.split('@')[0]
      return {
        type: 'referrer',
        referrer: {
          id: sessionUser.id,
          name,
          email: sessionUser.email,
          kind,
          code: typeof promo?.code === 'string' ? promo.code : null,
        },
      }
    }

    if (member) {
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
        type: 'salon',
        user: {
          id: sessionUser.id,
          name,
          email: sessionUser.email,
          salonId: salon.salonId,
          salonName: salon.salonName,
          role: salon.role,
          billingEmail: salon.billingEmail,
          welcomeCompletedAt:
            typeof profile?.welcome_completed_at === 'string'
              ? profile.welcome_completed_at
              : null,
        },
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }

  setActiveSalon(null)
  return null
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  const identity = await loadIdentity()
  return identity?.type === 'salon' ? identity.user : null
}

export function homePathFor(identity: SessionIdentity): string {
  return identity.type === 'referrer' ? paths.rewards : paths.dashboard
}

export async function register(
  name: string,
  email: string,
  password: string,
  salonName: string,
  promoCode = '',
): Promise<AuthResult> {
  try {
    requireSupabaseConfig()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedSalon = salonName.trim()
    const cleanedPromo = sanitizePromoCode(promoCode)
    if (!trimmedName) return { ok: false, error: 'Enter your name.' }
    if (!trimmedEmail.includes('@')) return { ok: false, error: 'Enter a valid email.' }
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters for the password.' }
    }
    if (!trimmedSalon) return { ok: false, error: 'Enter the salon name.' }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          salon_name: trimmedSalon,
          ...(cleanedPromo ? { promo_code: cleanedPromo } : {}),
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

    const identity = await loadIdentity()
    if (!identity || identity.type !== 'salon') {
      return {
        ok: false,
        error:
          'Your account was created, but the salon setup is still finishing. Please sign in again.',
      }
    }
    return { ok: true, user: identity.user }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Your account could not be created. Please try again.',
    }
  }
}

export async function registerChampion(
  name: string,
  email: string,
  password: string,
): Promise<SignInResult> {
  try {
    requireSupabaseConfig()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedName) return { ok: false, error: 'Enter your name.' }
    if (!trimmedEmail.includes('@')) return { ok: false, error: 'Enter a valid email.' }
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters for the password.' }
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${paths.rewards}`,
        data: {
          name: trimmedName,
          referrer_kind: 'champion',
        },
      },
    })
    if (error) return { ok: false, error: error.message }
    if (!data.session) {
      return {
        ok: false,
        error:
          'Check your email to confirm the account, then sign in on Rewards.',
      }
    }

    const identity = await loadIdentity()
    if (!identity || identity.type !== 'referrer') {
      return {
        ok: false,
        error: 'Your account was created, but rewards setup is still finishing. Please sign in again.',
      }
    }
    return { ok: true, identity }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Your Brand Champion account could not be created. Please try again.',
    }
  }
}

export async function login(email: string, password: string): Promise<SignInResult> {
  try {
    requireSupabaseConfig()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) return { ok: false, error: error.message }
    const identity = await loadIdentity()
    if (!identity) {
      return {
        ok: false,
        error: 'Signed in, but this login is not attached to a salon or rewards account.',
      }
    }
    return { ok: true, identity }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'We could not sign you in. Check your details and try again.',
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
  promoCode?: string
}): Promise<AuthResult> {
  return register(
    input.name,
    input.email,
    input.password,
    input.salonName,
    input.promoCode ?? '',
  )
}

export function loginAccount(input: {
  email: string
  password: string
}): Promise<SignInResult> {
  return login(input.email, input.password)
}

export async function logoutTo(path: string) {
  await logout()
  window.location.assign(path)
}
