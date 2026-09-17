export type ReferrerKind = 'influencer' | 'champion'

export const REFERRER_KINDS = ['influencer', 'champion'] as const

export const RESERVED_PROMO_CODES = [
  'LOGIN',
  'ADMIN',
  'RESET',
  'CHAMPION',
  'INFLUENCER',
  'REWARDS',
  'REGISTER',
  'APP',
  'SALON',
  'NEWRECALL',
  'SUPPORT',
  'TRIAL',
] as const

export function sanitizePromoCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function validatePromoCodeFormat(code: string): string | null {
  if (!code) return 'Enter a promo code.'
  if (code.length < 4 || code.length > 12) {
    return 'Use 4 to 12 letters or numbers.'
  }
  if ((RESERVED_PROMO_CODES as readonly string[]).includes(code)) {
    return 'That code is reserved. Choose another.'
  }
  return null
}

export function isReferrerKind(value: string | null | undefined): value is ReferrerKind {
  return value === 'influencer' || value === 'champion'
}

export function referrerLabel(kind: ReferrerKind): string {
  return kind === 'influencer' ? 'Influencer' : 'Brand Champion'
}

export function resolveBountyCents(input: {
  kind: ReferrerKind
  overrideCents: number | null
  influencerBountyCents: number
  championBountyCents: number
}): number {
  const fallback =
    input.kind === 'influencer'
      ? input.influencerBountyCents
      : input.championBountyCents
  const amount = input.overrideCents ?? fallback
  return amount > 0 ? amount : 0
}

export function zarToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '')
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function pendingCents(earnedCents: number, paidCents: number): number {
  return Math.max(0, earnedCents - paidCents)
}

export function centsToZarInput(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)
}
