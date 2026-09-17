import {
  isReferrerKind,
  pendingCents,
  referrerLabel,
  sanitizePromoCode,
  validatePromoCodeFormat,
  zarToCents,
  type ReferrerKind,
} from '../../src/lib/promoCode.js'
import { supabaseAdmin } from './supabaseAdmin.js'

export type ReferralAdminRow = {
  id: string
  code: string
  kind: ReferrerKind
  label: string
  email: string
  name: string
  overrideCents: number | null
  signupCount: number
  earnedCents: number
  paidCents: number
  pendingCents: number
  lastPayoutAt: string | null
}

export type ReferralAdminPayload = {
  influencerBountyCents: number
  championBountyCents: number
  rows: ReferralAdminRow[]
}

async function configRow() {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('referral_config')
    .select('influencer_bounty_cents, champion_bounty_cents')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    influencerBountyCents: Number(data?.influencer_bounty_cents ?? 0),
    championBountyCents: Number(data?.champion_bounty_cents ?? 0),
  }
}

export async function loadReferralAdmin(): Promise<ReferralAdminPayload> {
  const admin = supabaseAdmin()
  const config = await configRow()
  const { data: codes, error } = await admin
    .from('promo_codes')
    .select('id, code, kind, owner_user_id, bounty_cents, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const list = codes ?? []
  if (list.length === 0) return { ...config, rows: [] }

  const ownerIds = [...new Set(list.map((row) => row.owner_user_id))]
  const promoIds = list.map((row) => row.id)
  const [
    { data: profiles, error: profileError },
    { data: redemptions, error: redemptionError },
    { data: credits, error: creditError },
    { data: payouts, error: payoutError },
  ] = await Promise.all([
    admin.from('profiles').select('id, email, name').in('id', ownerIds),
    admin.from('referral_redemptions').select('promo_code_id').in('promo_code_id', promoIds),
    admin
      .from('referral_credits')
      .select('promo_code_id, amount_cents')
      .in('promo_code_id', promoIds),
    admin
      .from('referral_payouts')
      .select('promo_code_id, amount_cents, paid_at')
      .in('promo_code_id', promoIds)
      .order('paid_at', { ascending: false }),
  ])
  if (profileError) throw new Error(profileError.message)
  if (redemptionError) throw new Error(redemptionError.message)
  if (creditError) throw new Error(creditError.message)
  if (payoutError) throw new Error(payoutError.message)

  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]))
  const signupByCode = new Map<string, number>()
  for (const row of redemptions ?? []) {
    signupByCode.set(row.promo_code_id, (signupByCode.get(row.promo_code_id) || 0) + 1)
  }
  const earnedByCode = new Map<string, number>()
  for (const row of credits ?? []) {
    earnedByCode.set(
      row.promo_code_id,
      (earnedByCode.get(row.promo_code_id) || 0) + Number(row.amount_cents || 0),
    )
  }
  const paidByCode = new Map<string, number>()
  const lastPayoutByCode = new Map<string, string>()
  for (const row of payouts ?? []) {
    paidByCode.set(
      row.promo_code_id,
      (paidByCode.get(row.promo_code_id) || 0) + Number(row.amount_cents || 0),
    )
    if (!lastPayoutByCode.has(row.promo_code_id) && row.paid_at) {
      lastPayoutByCode.set(row.promo_code_id, row.paid_at)
    }
  }

  const rows: ReferralAdminRow[] = list.map((code) => {
    const kind = isReferrerKind(code.kind) ? code.kind : 'champion'
    const profile = profileById.get(code.owner_user_id)
    const earned = earnedByCode.get(code.id) || 0
    const paid = paidByCode.get(code.id) || 0
    return {
      id: code.id,
      code: code.code,
      kind,
      label: referrerLabel(kind),
      email: profile?.email || '',
      name: profile?.name || '',
      overrideCents: typeof code.bounty_cents === 'number' ? code.bounty_cents : null,
      signupCount: signupByCode.get(code.id) || 0,
      earnedCents: earned,
      paidCents: paid,
      pendingCents: pendingCents(earned, paid),
      lastPayoutAt: lastPayoutByCode.get(code.id) ?? null,
    }
  })
  rows.sort((a, b) => b.pendingCents - a.pendingCents)
  return { ...config, rows }
}

export async function saveReferralConfig(input: {
  influencerBountyZar: string
  championBountyZar: string
}): Promise<ReferralAdminPayload> {
  const influencer = zarToCents(input.influencerBountyZar)
  const champion = zarToCents(input.championBountyZar)
  if (influencer == null || champion == null) {
    throw new Error('Enter bounty amounts in rand.')
  }
  const admin = supabaseAdmin()
  const { error } = await admin.from('referral_config').upsert({
    id: 1,
    influencer_bounty_cents: influencer,
    champion_bounty_cents: champion,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
  return loadReferralAdmin()
}

export async function saveCodeOverride(input: {
  promoCodeId: string
  overrideZar: string
}): Promise<ReferralAdminPayload> {
  const trimmed = input.overrideZar.trim()
  const cents = trimmed === '' ? null : zarToCents(trimmed)
  if (trimmed && cents == null) {
    throw new Error('Enter a bounty override in rand, or leave it blank.')
  }
  const admin = supabaseAdmin()
  const { error } = await admin
    .from('promo_codes')
    .update({ bounty_cents: cents })
    .eq('id', input.promoCodeId)
  if (error) throw new Error(error.message)
  return loadReferralAdmin()
}

export async function recordReferralPayout(input: {
  promoCodeId: string
  amountZar: string
  note: string
}): Promise<ReferralAdminPayload> {
  const cents = zarToCents(input.amountZar)
  if (cents == null || cents <= 0) {
    throw new Error('Enter a payout amount in rand.')
  }
  const snapshot = await loadReferralAdmin()
  const row = snapshot.rows.find((item) => item.id === input.promoCodeId)
  if (!row) throw new Error('That rewards account was not found.')
  if (cents > row.pendingCents) {
    throw new Error('That payout is more than the pending balance.')
  }
  const admin = supabaseAdmin()
  const { error } = await admin.from('referral_payouts').insert({
    promo_code_id: input.promoCodeId,
    amount_cents: cents,
    note: input.note.trim(),
  })
  if (error) throw new Error(error.message)
  return loadReferralAdmin()
}

function rewardsOrigin(host: string | undefined, origin?: string): string {
  if (origin) {
    try {
      return new URL(origin).origin
    } catch {
      // Fall through to the Host header.
    }
  }
  const value = (host || 'salon.newrecall.com').split(',')[0].trim()
  const proto = value.includes('localhost') || value.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${value}`
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (profile?.id) return profile.id as string
  const perPage = 200
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break
    const users = (data.users ?? []) as { id: string; email?: string | null }[]
    const match = users.find((user) => user.email?.trim().toLowerCase() === email)
    if (match) return match.id
    if (users.length < perPage) break
  }
  return null
}

export async function inviteInfluencer(input: {
  name: string
  email: string
  code: string
  overrideZar: string
  host?: string
  origin?: string
}): Promise<ReferralAdminPayload> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const code = sanitizePromoCode(input.code)
  if (!name) throw new Error('Enter a name.')
  if (!email.includes('@')) throw new Error('Enter a valid email.')
  const formatError = validatePromoCodeFormat(code)
  if (formatError) throw new Error(formatError)
  const override =
    input.overrideZar.trim() === '' ? null : zarToCents(input.overrideZar)
  if (input.overrideZar.trim() && override == null) {
    throw new Error('Enter a bounty override in rand, or leave it blank.')
  }

  const admin = supabaseAdmin()
  const { data: taken } = await admin
    .from('promo_codes')
    .select('id, owner_user_id')
    .eq('code', code)
    .maybeSingle()
  if (taken) throw new Error('That code is already taken.')

  const existingId = await findUserIdByEmail(email)
  if (existingId) {
    const [{ data: profile }, { data: member }, { data: owned }] = await Promise.all([
      admin.from('profiles').select('referrer_kind, name').eq('id', existingId).maybeSingle(),
      admin.from('salon_members').select('salon_id').eq('user_id', existingId).maybeSingle(),
      admin.from('promo_codes').select('code').eq('owner_user_id', existingId).maybeSingle(),
    ])
    if (member) throw new Error('That email already belongs to a salon account.')
    if (owned?.code) throw new Error('That email already has a promo code.')
    if (profile?.referrer_kind !== 'influencer') {
      throw new Error('That email already has an account.')
    }
    const { error: codeError } = await admin.from('promo_codes').insert({
      code,
      kind: 'influencer',
      owner_user_id: existingId,
      bounty_cents: override,
    })
    if (codeError) throw new Error(codeError.message)
    return loadReferralAdmin()
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${rewardsOrigin(input.host, input.origin)}/rewards`,
      data: { name, referrer_kind: 'influencer' },
    },
  )
  if (inviteError) throw new Error(inviteError.message)
  const userId = invited.user?.id
  if (!userId) throw new Error('The Influencer invite could not be created.')

  await admin.from('profiles').upsert({
    id: userId,
    name,
    email,
    referrer_kind: 'influencer',
  })

  const { error: codeError } = await admin.from('promo_codes').insert({
    code,
    kind: 'influencer',
    owner_user_id: userId,
    bounty_cents: override,
  })
  if (codeError) throw new Error(codeError.message)
  return loadReferralAdmin()
}
