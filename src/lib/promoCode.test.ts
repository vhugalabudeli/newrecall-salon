import { describe, expect, it } from 'vitest'
import {
  pendingCents,
  resolveBountyCents,
  sanitizePromoCode,
  validatePromoCodeFormat,
  zarToCents,
  centsToZarInput,
} from './promoCode'

describe('sanitizePromoCode', () => {
  it('strips spaces and punctuation and uppercases', () => {
    expect(sanitizePromoCode('  ab-12 code ')).toBe('AB12CODE')
  })
})

describe('validatePromoCodeFormat', () => {
  it('requires 4 to 12 characters', () => {
    expect(validatePromoCodeFormat('AB')).toBe('Use 4 to 12 letters or numbers.')
    expect(validatePromoCodeFormat('ABCDEFGHIJKLM')).toBe(
      'Use 4 to 12 letters or numbers.',
    )
  })

  it('blocks reserved words', () => {
    expect(validatePromoCodeFormat('LOGIN')).toBe(
      'That code is reserved. Choose another.',
    )
  })

  it('accepts a short alphanumeric code', () => {
    expect(validatePromoCodeFormat('SALLY1')).toBeNull()
  })
})

describe('resolveBountyCents', () => {
  it('uses the per-code override when set', () => {
    expect(
      resolveBountyCents({
        kind: 'champion',
        overrideCents: 15_000,
        influencerBountyCents: 20_000,
        championBountyCents: 5_000,
      }),
    ).toBe(15_000)
  })

  it('uses the tier default when there is no override', () => {
    expect(
      resolveBountyCents({
        kind: 'influencer',
        overrideCents: null,
        influencerBountyCents: 20_000,
        championBountyCents: 5_000,
      }),
    ).toBe(20_000)
  })
})

describe('zarToCents', () => {
  it('parses rand as integer cents', () => {
    expect(zarToCents('150')).toBe(15_000)
    expect(zarToCents('150.50')).toBe(15_050)
  })
})

describe('centsToZarInput', () => {
  it('drops trailing zeros for whole rands', () => {
    expect(centsToZarInput(15_000)).toBe('150')
    expect(centsToZarInput(15_050)).toBe('150.50')
  })
})

describe('pendingCents', () => {
  it('never goes below zero', () => {
    expect(pendingCents(10_000, 12_000)).toBe(0)
    expect(pendingCents(30_000, 10_000)).toBe(20_000)
  })
})
