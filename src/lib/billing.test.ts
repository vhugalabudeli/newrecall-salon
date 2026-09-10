import { describe, expect, it } from 'vitest'
import { accessLabel, type BillingStatus } from './billing'

function status(overrides: Partial<BillingStatus> = {}): BillingStatus {
  return {
    entitled: true,
    willRenew: true,
    period: 'trial',
    trialEndsAt: '2026-10-10T00:00:00.000Z',
    nextPaymentDate: '2026-10-10T00:00:00.000Z',
    subscriptionCode: 'SUB_test',
    customerCode: 'CUS_test',
    email: 'owner@example.com',
    ...overrides,
  }
}

describe('accessLabel', () => {
  it('shows cancelled while a non-renewing subscription remains entitled', () => {
    expect(accessLabel(status({ willRenew: false }))).toBe('Cancelled')
  })

  it('keeps the normal label for a renewing trial', () => {
    expect(accessLabel(status())).toBe('Free trial')
  })

  it('does not call an expired entitlement cancelled', () => {
    expect(accessLabel(status({ entitled: false, willRenew: false }))).toBe(
      'No active plan',
    )
  })
})
