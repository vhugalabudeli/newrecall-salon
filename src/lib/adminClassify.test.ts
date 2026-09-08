import { describe, expect, it } from 'vitest'
import {
  accessBucketForSub,
  billingCsvLine,
  chargeKind,
  disputeBucket,
  isFailedRenewal,
  isStuckEntitlement,
  keyModeFromSecret,
  moneyTotals,
  pickAccessBucket,
  rowMatchesMode,
  setupCheckState,
  subscriptionListStatus,
  trialEndFromDates,
} from './adminClassify'

describe('key mode and domain filter', () => {
  it('reads live vs test vs missing from the secret prefix', () => {
    expect(keyModeFromSecret('sk_live_abc')).toBe('live')
    expect(keyModeFromSecret('sk_test_abc')).toBe('test')
    expect(keyModeFromSecret('')).toBe('missing')
  })

  it('never mixes test rows into live totals', () => {
    expect(rowMatchesMode('test', 'live')).toBe(false)
    expect(rowMatchesMode('live', 'live')).toBe(true)
    expect(rowMatchesMode(undefined, 'live')).toBe(false)
  })
})

describe('amounts', () => {
  it('labels R1 vs R200', () => {
    expect(chargeKind(100)).toBe('r1')
    expect(chargeKind(20_000)).toBe('r200')
    expect(chargeKind(500)).toBe('other')
  })
})

describe('trial vs monthly', () => {
  it('treats a far next payment as the trial end', () => {
    const created = '2026-09-01T00:00:00.000Z'
    const next = '2026-10-01T00:00:00.000Z'
    expect(trialEndFromDates(next, created)).toBe(new Date(next).toISOString())
    expect(trialEndFromDates('2026-09-02T00:00:00.000Z', created)).toBe(null)
  })

  it('lists an in-trial open sub as trial', () => {
    const trialEnd = '2026-10-01T00:00:00.000Z'
    const now = Date.parse('2026-09-08T00:00:00.000Z')
    expect(subscriptionListStatus('active', trialEnd, now)).toBe('trial')
    expect(accessBucketForSub({ status: 'active', trialEndsAt: trialEnd, now })).toBe(
      'trial',
    )
    expect(
      accessBucketForSub({ status: 'active', trialEndsAt: null, now }),
    ).toBe('paid')
  })
})

describe('entitlement', () => {
  it('flags a successful setup with no open subscription', () => {
    expect(
      isStuckEntitlement({ setupSuccess: true, hasOpenSubscription: false }),
    ).toBe(true)
    expect(
      isStuckEntitlement({ setupSuccess: true, hasOpenSubscription: true }),
    ).toBe(false)
  })

  it('counts none / trial / paid / cancelled per email', () => {
    expect(pickAccessBucket([])).toBe('none')
    expect(
      pickAccessBucket([
        { status: 'cancelled', trialEndsAt: null },
        { status: 'active', trialEndsAt: '2099-01-01T00:00:00.000Z' },
      ]),
    ).toBe('trial')
  })
})

describe('R1 check and renewals', () => {
  it('marks setup charges succeeded, refunded, or stuck', () => {
    expect(
      setupCheckState({ txStatus: 'success', hasRefund: false }),
    ).toBe('succeeded')
    expect(
      setupCheckState({ txStatus: 'success', hasRefund: true }),
    ).toBe('refunded')
    expect(
      setupCheckState({
        txStatus: 'success',
        hasRefund: false,
        refundFailed: true,
      }),
    ).toBe('stuck')
  })

  it('treats attention and failed R200 as failed renewals', () => {
    expect(isFailedRenewal({ subStatus: 'attention' })).toBe(true)
    expect(isFailedRenewal({ txStatus: 'failed', amountCents: 20_000 })).toBe(
      true,
    )
    expect(isFailedRenewal({ txStatus: 'failed', amountCents: 100 })).toBe(false)
  })
})

describe('disputes and money', () => {
  it('buckets open, won, and lost disputes', () => {
    expect(disputeBucket('awaiting-merchant-feedback')).toBe('open')
    expect(disputeBucket('resolved', 'declined')).toBe('won')
    expect(disputeBucket('resolved', 'merchant-accepted')).toBe('lost')
  })

  it('nets 30-day money in cents', () => {
    expect(moneyTotals(40_000, 20_000)).toEqual({
      grossCents: 40_000,
      refundCents: 20_000,
      netCents: 20_000,
    })
  })

  it('writes billing CSV without card fields', () => {
    const line = billingCsvLine({
      email: 'a@b.com',
      plan: 'NewRecall Salon Monthly',
      amountCents: 20_000,
      reference: 'ref_1',
    })
    expect(line).toBe('a@b.com,NewRecall Salon Monthly,200,ref_1')
    expect(line.includes('AUTH_')).toBe(false)
  })
})
