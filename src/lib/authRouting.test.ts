import { describe, expect, it } from 'vitest'
import { homePathFor } from './auth'

describe('homePathFor', () => {
  it('sends referrers to rewards', () => {
    expect(
      homePathFor({
        type: 'referrer',
        referrer: {
          id: '1',
          name: 'Sam',
          email: 'sam@example.com',
          kind: 'champion',
          code: 'SAM1',
        },
      }),
    ).toBe('/rewards')
  })

  it('sends salon members to the app', () => {
    expect(
      homePathFor({
        type: 'salon',
        user: {
          id: '1',
          name: 'Owner',
          email: 'owner@example.com',
          salonId: 'salon-1',
          salonName: 'Bloom',
          role: 'owner',
          billingEmail: 'owner@example.com',
          welcomeCompletedAt: null,
        },
      }),
    ).toBe('/app')
  })
})
