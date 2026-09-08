export const PLAN_NAME = 'NewRecall Salon Monthly'
export const PLAN_AMOUNT_CENTS = 20_000
export const SETUP_AMOUNT_CENTS = 100
export const TRIAL_DAYS = 30
export const CURRENCY = 'ZAR'

export type PaystackDomain = 'test' | 'live'
export type KeyMode = 'test' | 'live' | 'missing'
export type AccessBucket = 'none' | 'trial' | 'paid' | 'cancelled'
export type SubListStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'cancelled'
  | 'non_renewing'
export type SetupCheckState = 'succeeded' | 'refunded' | 'stuck'
export type DisputeBucket = 'open' | 'won' | 'lost'
export type ChargeKind = 'r1' | 'r200' | 'other'

export function keyModeFromSecret(secret: string | undefined): KeyMode {
  const key = secret?.trim() ?? ''
  if (!key) return 'missing'
  if (key.startsWith('sk_live_')) return 'live'
  return 'test'
}

export function rowMatchesMode(
  domain: string | undefined,
  mode: PaystackDomain,
): boolean {
  if (!domain) return false
  return domain === mode
}

export function chargeKind(amountCents: number): ChargeKind {
  if (amountCents === SETUP_AMOUNT_CENTS) return 'r1'
  if (amountCents === PLAN_AMOUNT_CENTS) return 'r200'
  return 'other'
}

export function formatZarFromCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`
}

export function isSetupCharge(amountCents: number, purpose?: string): boolean {
  if (purpose === 'trial_setup') return true
  return amountCents === SETUP_AMOUNT_CENTS
}

export function setupCheckState(input: {
  txStatus: string
  hasRefund: boolean
  refundFailed?: boolean
}): SetupCheckState | null {
  if (input.txStatus !== 'success') return null
  if (input.hasRefund) return 'refunded'
  if (input.refundFailed) return 'stuck'
  return 'succeeded'
}

export function isOpenSubscription(status: string): boolean {
  return (
    status === 'active' || status === 'non-renewing' || status === 'attention'
  )
}

export function trialEndFromDates(
  nextPaymentDate: string | undefined,
  createdAt: string | undefined,
): string | null {
  if (!nextPaymentDate) return null
  const created = Date.parse(createdAt || '')
  const nextAt = Date.parse(nextPaymentDate)
  if (Number.isNaN(nextAt)) return null
  if (!Number.isNaN(created) && nextAt - created >= 20 * 24 * 60 * 60 * 1000) {
    return new Date(nextAt).toISOString()
  }
  return null
}

export function periodForTrialEnd(
  trialEndsAt: string | null,
  now = Date.now(),
): 'trial' | 'monthly' {
  if (trialEndsAt && now < new Date(trialEndsAt).getTime()) return 'trial'
  return 'monthly'
}

export function subscriptionListStatus(
  status: string,
  trialEndsAt: string | null,
  now = Date.now(),
): SubListStatus {
  if (status === 'attention') return 'past_due'
  if (status === 'non-renewing') return 'non_renewing'
  if (status === 'cancelled' || status === 'completed') return 'cancelled'
  if (status === 'active' && periodForTrialEnd(trialEndsAt, now) === 'trial') {
    return 'trial'
  }
  return 'active'
}

export function accessBucketForSub(input: {
  status: string
  trialEndsAt: string | null
  now?: number
}): AccessBucket | null {
  const now = input.now ?? Date.now()
  if (isOpenSubscription(input.status)) {
    return periodForTrialEnd(input.trialEndsAt, now) === 'trial'
      ? 'trial'
      : 'paid'
  }
  if (input.status === 'cancelled' || input.status === 'completed') {
    return 'cancelled'
  }
  return null
}

export function pickAccessBucket(
  statuses: Array<{ status: string; trialEndsAt: string | null }>,
  now = Date.now(),
): AccessBucket {
  const buckets = statuses
    .map((row) => accessBucketForSub({ ...row, now }))
    .filter((row): row is AccessBucket => row !== null)
  if (buckets.includes('trial')) return 'trial'
  if (buckets.includes('paid')) return 'paid'
  if (buckets.includes('cancelled')) return 'cancelled'
  return 'none'
}

export function isStuckEntitlement(input: {
  setupSuccess: boolean
  hasOpenSubscription: boolean
}): boolean {
  return input.setupSuccess && !input.hasOpenSubscription
}

export function isFailedRenewal(input: {
  subStatus?: string
  txStatus?: string
  amountCents?: number
}): boolean {
  if (input.subStatus === 'attention') return true
  if (
    input.txStatus === 'failed' &&
    input.amountCents === PLAN_AMOUNT_CENTS
  ) {
    return true
  }
  return false
}

export function disputeBucket(
  status: string,
  resolution?: string | null,
): DisputeBucket {
  const s = status.toLowerCase()
  if (s.includes('awaiting') || s === 'pending') return 'open'
  if (s === 'resolved' || s === 'archived') {
    const r = (resolution || '').toLowerCase()
    if (r.includes('merchant-accepted') || r.includes('lost')) return 'lost'
    if (r.includes('declined') || r.includes('won')) return 'won'
    return 'won'
  }
  return 'open'
}

export function moneyTotals(grossCents: number, refundCents: number) {
  return {
    grossCents,
    refundCents,
    netCents: grossCents - refundCents,
  }
}

export function isActivationReviewError(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes('awaiting review') ||
    text.includes('go live') ||
    text.includes('not been activated') ||
    text.includes('activate your') ||
    text.includes('live payments')
  )
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function billingCsvLine(input: {
  email: string
  plan: string
  amountCents: number
  reference: string
}): string {
  return [
    csvEscape(input.email),
    csvEscape(input.plan),
    String(input.amountCents / 100),
    csvEscape(input.reference),
  ].join(',')
}
