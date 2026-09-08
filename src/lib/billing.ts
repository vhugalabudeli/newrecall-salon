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
  if (!info || !info.entitled) return 'No plan'
  if (info.period === 'trial') return 'Free trial'
  if (info.period === 'monthly') return 'Monthly'
  return 'No plan'
}

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'Request failed.'
    throw new Error(error)
  }
  return json as T
}

export function fetchBillingStatus(email: string): Promise<BillingStatus> {
  return post<BillingStatus>('/api/paystack/status', { email })
}

export function startTrialCheckout(input: {
  email: string
  userId: string
}): Promise<{ accessCode: string; reference: string }> {
  return post('/api/paystack/initialize', input)
}

export function finishTrialCheckout(input: {
  email: string
  userId: string
  reference: string
}): Promise<BillingStatus> {
  return post<BillingStatus>('/api/paystack/complete', input)
}

export async function openBillingPortal(input: {
  email: string
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
          reject(new Error(error?.message || 'Paystack checkout failed.'))
        },
      })
    })
  })
}
