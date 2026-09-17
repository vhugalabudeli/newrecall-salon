import { accessToken } from './auth'
import type { ReferrerKind } from './promoCode'

export type RewardConfig = {
  championBountyCents: number
  influencerBountyCents: number
}

export type RewardCredit = {
  id: string
  amountCents: number
  createdAt: string
}

export type RewardPayout = {
  id: string
  amountCents: number
  note: string
  paidAt: string
}

export type RewardHub = {
  kind: ReferrerKind
  label: string
  name: string
  email: string
  code: string | null
  bountyCents: number
  signupCount: number
  earnedCents: number
  paidCents: number
  pendingCents: number
  credits: RewardCredit[]
  payouts: RewardPayout[]
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  fallback: string,
): Promise<T> {
  const token = await accessToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : fallback
    throw new Error(error)
  }
  return json as T
}

export function fetchRewardConfig(): Promise<RewardConfig> {
  return request('/api/rewards/config', {}, 'Rewards could not be loaded.')
}

export async function lookupPromoCode(code: string): Promise<{
  valid: boolean
  reason?: string
}> {
  const res = await fetch('/api/rewards/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'That code could not be checked.'
    throw new Error(error)
  }
  return json as { valid: boolean; reason?: string }
}

export async function gateChampionJoin(): Promise<void> {
  await request('/api/rewards/join', { method: 'POST', body: '{}' }, 'You could not join right now. Try again shortly.')
}

export function checkPromoAvailable(code: string): Promise<{
  available: boolean
  own?: boolean
  reason?: string
}> {
  return request(
    '/api/rewards/available',
    { method: 'POST', body: JSON.stringify({ code }) },
    'That code could not be checked.',
  )
}

export function claimPromoCode(code: string): Promise<{ code: string; kind: ReferrerKind }> {
  return request(
    '/api/rewards/claim',
    { method: 'POST', body: JSON.stringify({ code }) },
    'The code could not be claimed.',
  )
}

export function fetchRewardHub(): Promise<RewardHub> {
  return request(
    '/api/rewards/hub',
    { method: 'POST', body: '{}' },
    'Rewards could not be loaded.',
  )
}
