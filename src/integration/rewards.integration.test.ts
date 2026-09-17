import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, describe, expect, it } from 'vitest'
import {
  claimPromoCode,
  getRewardHub,
} from '../../api/_lib/rewards.js'
import { recordReferralPayout } from '../../api/_lib/referralAdmin.js'

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === '1'

type RecordedResponse = {
  statusCode: number
  body: unknown
}

function responseRecorder(): {
  response: VercelResponse
  recorded: () => RecordedResponse
} {
  let statusCode = 200
  let body: unknown
  const response = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(value: unknown) {
      body = value
      return this
    },
    end() {
      return this
    },
  } as unknown as VercelResponse
  return { response, recorded: () => ({ statusCode, body }) }
}

function request(
  method: string,
  token: string,
  body: Record<string, string>,
  identity: string,
): VercelRequest {
  return {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'x-forwarded-for': identity,
    },
    body,
    query: {},
  } as unknown as VercelRequest
}

describe.skipIf(!runIntegration)('rewards integration', () => {
  let admin: ReturnType<typeof createClient> | null = null
  const userIds: string[] = []
  let salonId: string | null = null

  afterEach(async () => {
    if (!admin) return
    if (salonId) {
      await admin.from('salons').delete().eq('id', salonId)
      salonId = null
    }
    for (const userId of userIds.reverse()) {
      await admin.auth.admin.deleteUser(userId)
    }
    userIds.length = 0
  })

  it(
    'claims a code, credits a referred salon through the auth trigger, and records a payout',
    async () => {
      const url = process.env.VITE_SUPABASE_URL?.trim() || ''
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
      expect(url, 'VITE_SUPABASE_URL must be configured').not.toBe('')
      expect(anonKey, 'VITE_SUPABASE_ANON_KEY must be configured').not.toBe('')
      expect(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY must be configured').not.toBe('')
      expect(
        process.env.UPSTASH_REDIS_REST_URL,
        'UPSTASH_REDIS_REST_URL must be configured',
      ).toBeTruthy()
      expect(
        process.env.UPSTASH_REDIS_REST_TOKEN,
        'UPSTASH_REDIS_REST_TOKEN must be configured',
      ).toBeTruthy()

      admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const anon = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      const code = `T${nonce}`.slice(0, 12).toUpperCase()
      const password = `NewRecall-${nonce}-A1!`
      const championEmail = `integration+champion-${nonce}@newrecall.com`
      const salonEmail = `integration+salon-${nonce}@newrecall.com`

      const { data: champion, error: championError } =
        await admin.auth.admin.createUser({
          email: championEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: 'Integration Champion',
            referrer_kind: 'champion',
          },
        })
      expect(championError).toBeNull()
      expect(champion.user).toBeTruthy()
      userIds.push(champion.user!.id)

      const { data: session, error: signInError } =
        await anon.auth.signInWithPassword({
          email: championEmail,
          password,
        })
      expect(signInError).toBeNull()
      expect(session.session?.access_token).toBeTruthy()
      const token = session.session!.access_token

      const claim = responseRecorder()
      await claimPromoCode(
        request('POST', token, { code }, `claim-${nonce}`),
        claim.response,
      )
      expect(claim.recorded()).toMatchObject({
        statusCode: 200,
        body: { code, kind: 'champion' },
      })

      const { data: promo, error: promoError } = await admin
        .from('promo_codes')
        .select('id')
        .eq('owner_user_id', champion.user!.id)
        .single()
      expect(promoError).toBeNull()
      expect(promo?.id).toBeTruthy()

      const { error: overrideError } = await admin
        .from('promo_codes')
        .update({ bounty_cents: 1_234 })
        .eq('id', promo!.id)
      expect(overrideError).toBeNull()

      const { data: salonOwner, error: salonError } =
        await admin.auth.admin.createUser({
          email: salonEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: 'Integration Salon Owner',
            salon_name: 'Integration Test Salon',
            promo_code: code,
          },
        })
      expect(salonError).toBeNull()
      expect(salonOwner.user).toBeTruthy()
      userIds.push(salonOwner.user!.id)

      const { data: membership, error: membershipError } = await admin
        .from('salon_members')
        .select('salon_id, role')
        .eq('user_id', salonOwner.user!.id)
        .single()
      expect(membershipError).toBeNull()
      expect(membership?.role).toBe('owner')
      salonId = membership!.salon_id

      const { data: redemption, error: redemptionError } = await admin
        .from('referral_redemptions')
        .select('id, bounty_cents')
        .eq('referred_salon_id', salonId)
        .eq('promo_code_id', promo!.id)
        .single()
      expect(redemptionError).toBeNull()
      expect(redemption?.bounty_cents).toBe(1_234)

      const { data: credit, error: creditError } = await admin
        .from('referral_credits')
        .select('amount_cents')
        .eq('redemption_id', redemption!.id)
        .single()
      expect(creditError).toBeNull()
      expect(credit?.amount_cents).toBe(1_234)

      const hubBeforePayout = responseRecorder()
      await getRewardHub(
        request('POST', token, {}, `hub-before-${nonce}`),
        hubBeforePayout.response,
      )
      expect(hubBeforePayout.recorded()).toMatchObject({
        statusCode: 200,
        body: {
          code,
          signupCount: 1,
          earnedCents: 1_234,
          paidCents: 0,
          pendingCents: 1_234,
        },
      })

      await recordReferralPayout({
        promoCodeId: promo!.id,
        amountZar: '12.34',
        note: 'Automated integration test',
      })

      const hubAfterPayout = responseRecorder()
      await getRewardHub(
        request('POST', token, {}, `hub-after-${nonce}`),
        hubAfterPayout.response,
      )
      expect(hubAfterPayout.recorded()).toMatchObject({
        statusCode: 200,
        body: {
          code,
          signupCount: 1,
          earnedCents: 1_234,
          paidCents: 1_234,
          pendingCents: 0,
        },
      })
    },
    30_000,
  )
})
