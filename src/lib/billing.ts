import { accessToken } from './auth'

export type BillingPeriod = 'trial' | 'monthly'

export type BillingStatus = {
  entitled: boolean
  period: BillingPeriod | 'none'
  trialEndsAt: string | null
  nextPaymentDate: string | null
  subscriptionCode: string | null
  customerCode: string | null
  email: string
}

export function paywallBypassed(): boolean {
  return import.meta.env.VITE_PAYWALL_BYPASS === 'true'
}

export function accessLabel(info: BillingStatus | null): string {
  if (!info || !info.entitled) return 'No active plan'
  if (info.period === 'trial') return 'Free trial'
  if (info.period === 'monthly') return 'Monthly'
  return 'No active plan'
}

async function post<T>(path: string, body: Record<string, string> = {}): Promise<T> {
  const token = await accessToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'We could not check your subscription. Please try again.'
    throw new Error(error)
  }
  return json as T
}

export function fetchBillingStatus(): Promise<BillingStatus> {
  return post<BillingStatus>('/api/paystack/status')
}

export function startTrialCheckout(): Promise<{
  accessCode: string
  reference: string
}> {
  return post('/api/paystack/initialize')
}

export function finishTrialCheckout(input: {
  reference: string
}): Promise<BillingStatus> {
  return post<BillingStatus>('/api/paystack/complete', input)
}

export async function openBillingPortal(input: {
  subscriptionCode: string
}): Promise<string> {
  const data = await post<{ link: string }>('/api/paystack/portal', input)
  return data.link
}

export function openPaystackPopup(
  accessCode: string,
): Promise<{ reference: string } | 'cancelled'> {
  return import('@paystack/inline-js').then(({ default: PaystackPop }) => {
    return new Promise<{ reference: string } | 'cancelled'>((resolve, reject) => {
      const popup = new PaystackPop()
      popup.resumeTransaction(accessCode, {
        onSuccess: (transaction: { reference: string }) => {
          resolve({ reference: transaction.reference })
        },
        onCancel: () => resolve('cancelled'),
        onError: (error: { message?: string }) => {
          reject(new Error(error?.message || 'Checkout could not be completed.'))
        },
      })
    })
  })
}
