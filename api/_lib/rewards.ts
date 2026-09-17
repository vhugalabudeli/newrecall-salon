import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  pendingCents,
  referrerLabel,
  resolveBountyCents,
  sanitizePromoCode,
  validatePromoCodeFormat,
  isReferrerKind,
  type ReferrerKind,
} from '../../src/lib/promoCode.js'
import { httpErrorStatus } from './paystack.js'
import { assertRewardRateLimit } from './referralRateLimit.js'
import { supabaseAdmin, userFromBearer } from './supabaseAdmin.js'

type ReferrerActor = {
  userId: string
  email: string
  name: string
  kind: ReferrerKind
}

type ConfigRow = {
  influencer_bounty_cents: number
  champion_bounty_cents: number
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0]
  return req.socket?.remoteAddress || 'unknown'
}

function readBody(req: VercelRequest): Record<string, string> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body) as Record<string, unknown>
      const out: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' || typeof value === 'number') {
          out[key] = String(value)
        }
      }
      return out
    } catch {
      return {}
    }
  }
  if (req.body && typeof req.body === 'object') {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
      if (typeof value === 'string' || typeof value === 'number') {
        out[key] = String(value)
      }
    }
    return out
  }
  return {}
}

async function loadConfig(): Promise<ConfigRow> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('referral_config')
    .select('influencer_bounty_cents, champion_bounty_cents')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    influencer_bounty_cents: Number(data?.influencer_bounty_cents ?? 0),
    champion_bounty_cents: Number(data?.champion_bounty_cents ?? 0),
  }
}

async function referrerFromRequest(authHeader: string | undefined): Promise<ReferrerActor> {
  const user = await userFromBearer(authHeader)
  const email = user.email?.trim().toLowerCase()
  if (!email) throw new Error('Sign in required.')
  const admin = supabaseAdmin()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('name, referrer_kind, email')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const kind = isReferrerKind(profile?.referrer_kind) ? profile.referrer_kind : null
  if (!kind) throw new Error('This page is for Brand Champions and Influencers.')
  return {
    userId: user.id,
    email,
    name: (typeof profile?.name === 'string' && profile.name.trim()) || email.split('@')[0],
    kind,
  }
}

export async function getRewardConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const config = await loadConfig()
    res.status(200).json({
      championBountyCents: config.champion_bounty_cents,
      influencerBountyCents: config.influencer_bounty_cents,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Rewards could not be loaded.'
    res.status(httpErrorStatus(error)).json({ error: message })
  }
}

export async function gateChampionJoin(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    await assertRewardRateLimit({
      bucket: 'join',
      identity: clientIp(req),
      limit: 5,
      windowSeconds: 15 * 60,
    })
    res.status(200).json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'You could not join right now. Try again shortly.'
    const status = message.includes('Too many') ? 429 : httpErrorStatus(error)
    res.status(status).json({ error: message })
  }
}

export async function lookupPromoCode(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    await assertRewardRateLimit({
      bucket: 'lookup',
      identity: clientIp(req),
      limit: 20,
      windowSeconds: 10 * 60,
    })
    const raw =
      req.method === 'GET'
        ? String(req.query?.code || '')
        : readBody(req).code || ''
    const code = sanitizePromoCode(raw)
    const formatError = validatePromoCodeFormat(code)
    if (formatError) {
      res.status(200).json({ valid: false, reason: formatError })
      return
    }
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (error) throw new Error(error.message)
    res.status(200).json({
      valid: Boolean(data?.id),
      reason: data?.id ? undefined : 'That code is not recognised.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'That code could not be checked.'
    const status = message.includes('Too many') ? 429 : httpErrorStatus(error)
    res.status(status).json({ error: message })
  }
}

export async function checkPromoAvailable(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const actor = await referrerFromRequest(
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined,
    )
    await assertRewardRateLimit({
      bucket: 'available',
      identity: `${clientIp(req)}:${actor.userId}`,
      limit: 20,
      windowSeconds: 10 * 60,
    })
    const code = sanitizePromoCode(readBody(req).code || '')
    const formatError = validatePromoCodeFormat(code)
    if (formatError) {
      res.status(200).json({ available: false, reason: formatError })
      return
    }
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('promo_codes')
      .select('id, owner_user_id')
      .eq('code', code)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data?.owner_user_id === actor.userId) {
      res.status(200).json({ available: true, own: true })
      return
    }
    res.status(200).json({ available: !data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'That code could not be checked.'
    const status = message.includes('Too many') ? 429 : httpErrorStatus(error)
    res.status(status).json({ error: message })
  }
}

export async function claimPromoCode(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const actor = await referrerFromRequest(
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined,
    )
    await assertRewardRateLimit({
      bucket: 'claim',
      identity: `${clientIp(req)}:${actor.userId}`,
      limit: 5,
      windowSeconds: 15 * 60,
    })
    if (actor.kind !== 'champion') {
      res.status(403).json({ error: 'Influencers receive a code from NewRecall.' })
      return
    }
    const code = sanitizePromoCode(readBody(req).code || '')
    const formatError = validatePromoCodeFormat(code)
    if (formatError) {
      res.status(400).json({ error: formatError })
      return
    }
    const admin = supabaseAdmin()
    const { data: existing } = await admin
      .from('promo_codes')
      .select('code')
      .eq('owner_user_id', actor.userId)
      .maybeSingle()
    if (existing?.code) {
      res.status(200).json({ code: existing.code, kind: actor.kind })
      return
    }
    const { error } = await admin.from('promo_codes').insert({
      code,
      kind: 'champion',
      owner_user_id: actor.userId,
    })
    if (error) {
      if (error.code === '23505') {
        res.status(400).json({ error: 'That code is already taken.' })
        return
      }
      throw new Error(error.message)
    }
    res.status(200).json({ code, kind: actor.kind })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The code could not be claimed.'
    const status = message.includes('Too many') ? 429 : httpErrorStatus(error)
    res.status(status).json({ error: message })
  }
}

export async function getRewardHub(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const actor = await referrerFromRequest(
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined,
    )
    const admin = supabaseAdmin()
    const { data: promo, error: promoError } = await admin
      .from('promo_codes')
      .select('id, code, kind, bounty_cents')
      .eq('owner_user_id', actor.userId)
      .maybeSingle()
    if (promoError) throw new Error(promoError.message)
    const config = await loadConfig()
    if (!promo) {
      res.status(200).json({
        kind: actor.kind,
        label: referrerLabel(actor.kind),
        name: actor.name,
        email: actor.email,
        code: null,
        bountyCents: resolveBountyCents({
          kind: actor.kind,
          overrideCents: null,
          influencerBountyCents: config.influencer_bounty_cents,
          championBountyCents: config.champion_bounty_cents,
        }),
        signupCount: 0,
        earnedCents: 0,
        paidCents: 0,
        pendingCents: 0,
        credits: [],
        payouts: [],
      })
      return
    }
    const [
      { count: signupCount, error: signupError },
      { data: credits, error: creditError },
      { data: payouts, error: payoutError },
    ] = await Promise.all([
      admin
        .from('referral_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id),
      admin
        .from('referral_credits')
        .select('id, amount_cents, created_at')
        .eq('promo_code_id', promo.id)
        .order('created_at', { ascending: false }),
      admin
        .from('referral_payouts')
        .select('id, amount_cents, note, paid_at')
        .eq('promo_code_id', promo.id)
        .order('paid_at', { ascending: false }),
    ])
    if (signupError) throw new Error(signupError.message)
    if (creditError) throw new Error(creditError.message)
    if (payoutError) throw new Error(payoutError.message)
    const earnedCents = (credits ?? []).reduce(
      (sum, row) => sum + Number(row.amount_cents || 0),
      0,
    )
    const paidCents = (payouts ?? []).reduce(
      (sum, row) => sum + Number(row.amount_cents || 0),
      0,
    )
    res.status(200).json({
      kind: promo.kind,
      label: referrerLabel(promo.kind as ReferrerKind),
      name: actor.name,
      email: actor.email,
      code: promo.code,
      bountyCents: resolveBountyCents({
        kind: promo.kind as ReferrerKind,
        overrideCents:
          typeof promo.bounty_cents === 'number' ? promo.bounty_cents : null,
        influencerBountyCents: config.influencer_bounty_cents,
        championBountyCents: config.champion_bounty_cents,
      }),
      signupCount: signupCount ?? 0,
      earnedCents,
      paidCents,
      pendingCents: pendingCents(earnedCents, paidCents),
      credits: (credits ?? []).map((row) => ({
        id: row.id,
        amountCents: Number(row.amount_cents || 0),
        createdAt: row.created_at,
      })),
      payouts: (payouts ?? []).map((row) => ({
        id: row.id,
        amountCents: Number(row.amount_cents || 0),
        note: row.note || '',
        paidAt: row.paid_at,
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Rewards could not be loaded.'
    res.status(httpErrorStatus(error)).json({ error: message })
  }
}
