const PAYSTACK_BASE = 'https://api.paystack.co'
const PLAN_NAME = 'NewRecall Salon Monthly'
const PLAN_AMOUNT_CENTS = 20_000
const SETUP_AMOUNT_CENTS = 100
const TRIAL_DAYS = 30
const CURRENCY = 'ZAR'

type PaystackEnvelope<T> = {
  status: boolean
  message: string
  data: T
}

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

type PaystackCustomer = {
  id?: number
  customer_code: string
  email: string
}

type PaystackPlan = {
  plan_code: string
  name: string
  amount: number
  interval: string
  currency: string
}

type PaystackAuthorization = {
  authorization_code: string
  reusable: boolean
}

type PaystackTransaction = {
  id: number
  status: string
  reference: string
  amount: number
  currency: string
  customer: PaystackCustomer
  authorization: PaystackAuthorization
  metadata?: {
    user_id?: string
    purpose?: string
  }
}

type PaystackSubscription = {
  status: string
  subscription_code: string
  next_payment_date?: string
  createdAt?: string
  created_at?: string
  customer: PaystackCustomer | number
  plan: PaystackPlan | number
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key) throw new Error('Missing PAYSTACK_SECRET_KEY')
  return key
}

async function paystack<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const json = (await res.json()) as PaystackEnvelope<T>
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack ${path} failed`)
  }
  return json.data
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function planCodeOf(plan: PaystackSubscription['plan']): string | null {
  if (typeof plan === 'object' && plan && 'plan_code' in plan) {
    return plan.plan_code
  }
  return null
}

function isOpenStatus(status: string): boolean {
  return status === 'active' || status === 'non-renewing' || status === 'attention'
}

function periodFor(trialEndsAt: string | null): BillingPeriod {
  if (trialEndsAt && Date.now() < new Date(trialEndsAt).getTime()) return 'trial'
  return 'monthly'
}

function trialEndFrom(sub: PaystackSubscription): string | null {
  const next = sub.next_payment_date
  if (!next) return null
  const created = Date.parse(sub.createdAt || sub.created_at || '')
  const nextAt = Date.parse(next)
  if (Number.isNaN(nextAt)) return null
  if (!Number.isNaN(created) && nextAt - created >= 20 * 24 * 60 * 60 * 1000) {
    return new Date(nextAt).toISOString()
  }
  return null
}

let cachedPlanCode: string | null = process.env.PAYSTACK_PLAN_CODE?.trim() || null

async function ensurePlanCode(): Promise<string> {
  if (cachedPlanCode) return cachedPlanCode
  const envCode = process.env.PAYSTACK_PLAN_CODE?.trim()
  if (envCode) {
    cachedPlanCode = envCode
    return envCode
  }
  const listed = await paystack<PaystackPlan[] | { data?: PaystackPlan[] }>(
    '/plan?perPage=50',
  )
  const plans = Array.isArray(listed) ? listed : []
  const existing = plans.find(
    (plan) =>
      plan.name === PLAN_NAME &&
      plan.amount === PLAN_AMOUNT_CENTS &&
      plan.interval === 'monthly' &&
      plan.currency === CURRENCY,
  )
  if (existing) {
    cachedPlanCode = existing.plan_code
    return existing.plan_code
  }
  const created = await paystack<PaystackPlan>('/plan', {
    method: 'POST',
    body: JSON.stringify({
      name: PLAN_NAME,
      interval: 'monthly',
      amount: PLAN_AMOUNT_CENTS,
      currency: CURRENCY,
    }),
  })
  cachedPlanCode = created.plan_code
  return created.plan_code
}

async function subscriptionsForCustomer(
  customer: PaystackCustomer,
  planCode: string,
): Promise<PaystackSubscription[]> {
  const customerKey = customer.id ?? customer.customer_code
  const listed = await paystack<PaystackSubscription[]>(
    `/subscription?customer=${encodeURIComponent(String(customerKey))}&perPage=50`,
  )
  const rows = Array.isArray(listed) ? listed : []
  return rows.filter((row) => {
    const code = planCodeOf(row.plan)
    return !code || code === planCode
  })
}

async function findCustomer(email: string): Promise<PaystackCustomer | null> {
  try {
    return await paystack<PaystackCustomer>(
      `/customer/${encodeURIComponent(email)}`,
    )
  } catch {
    return null
  }
}

export async function initializeTrial(input: {
  email: string
  userId: string
}): Promise<{ accessCode: string; reference: string }> {
  const email = input.email.trim().toLowerCase()
  const userId = input.userId.trim()
  if (!email || !userId) throw new Error('Email and account id are required.')
  await ensurePlanCode()
  const data = await paystack<{ access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: SETUP_AMOUNT_CENTS,
        currency: CURRENCY,
        channels: ['card'],
        metadata: {
          user_id: userId,
          purpose: 'trial_setup',
        },
      }),
    },
  )
  return { accessCode: data.access_code, reference: data.reference }
}

export async function completeTrial(input: {
  reference: string
  email: string
  userId: string
}): Promise<BillingStatus> {
  const email = input.email.trim().toLowerCase()
  const userId = input.userId.trim()
  const reference = input.reference.trim()
  if (!email || !userId || !reference) {
    throw new Error('Missing checkout details.')
  }
  const tx = await paystack<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  )
  if (tx.status !== 'success') {
    throw new Error('Card verification did not complete.')
  }
  if (tx.currency !== CURRENCY || tx.amount < SETUP_AMOUNT_CENTS) {
    throw new Error('Unexpected setup charge.')
  }
  const txEmail = (tx.customer?.email || '').toLowerCase()
  if (txEmail && txEmail !== email) {
    throw new Error('This payment does not match the signed-in email.')
  }
  if (tx.metadata?.user_id && tx.metadata.user_id !== userId) {
    throw new Error('This payment does not match the signed-in account.')
  }
  if (!tx.authorization?.authorization_code || !tx.authorization.reusable) {
    throw new Error('Use a card that can be charged monthly.')
  }
  try {
    await paystack('/refund', {
      method: 'POST',
      body: JSON.stringify({
        transaction: tx.id,
        amount: SETUP_AMOUNT_CENTS,
        currency: CURRENCY,
        merchant_note: 'NewRecall trial card verification',
      }),
    })
  } catch {
    // Refunds can lag; the R1 setup charge is still refundable in Paystack.
  }
  const planCode = await ensurePlanCode()
  const customer: PaystackCustomer = {
    id: tx.customer.id,
    customer_code: tx.customer.customer_code,
    email: tx.customer.email || email,
  }
  const existing = await subscriptionsForCustomer(customer, planCode)
  const open = existing.find((row) => isOpenStatus(row.status))
  if (open) return statusForEmail(email)
  const start = addDays(TRIAL_DAYS)
  const created = await paystack<PaystackSubscription>('/subscription', {
    method: 'POST',
    body: JSON.stringify({
      customer: customer.customer_code,
      plan: planCode,
      authorization: tx.authorization.authorization_code,
      start_date: start.toISOString(),
    }),
  })
  return {
    entitled: true,
    period: 'trial',
    trialEndsAt: start.toISOString(),
    nextPaymentDate: start.toISOString(),
    subscriptionCode: created.subscription_code,
    customerCode: customer.customer_code,
    email,
  }
}

export async function statusForEmail(email: string): Promise<BillingStatus> {
  secretKey()
  const normalised = email.trim().toLowerCase()
  const empty: BillingStatus = {
    entitled: false,
    period: 'none',
    trialEndsAt: null,
    nextPaymentDate: null,
    subscriptionCode: null,
    customerCode: null,
    email: normalised,
  }
  if (!normalised) return empty
  const customer = await findCustomer(normalised)
  if (!customer) return empty
  const planCode = await ensurePlanCode()
  const subs = await subscriptionsForCustomer(customer, planCode)
  const open = subs.find((row) => isOpenStatus(row.status))
  if (!open) return { ...empty, customerCode: customer.customer_code }
  const trialEndsAt = trialEndFrom(open)
  const nextPaymentDate = open.next_payment_date
    ? new Date(open.next_payment_date).toISOString()
    : trialEndsAt
  return {
    entitled: true,
    period: periodFor(trialEndsAt),
    trialEndsAt,
    nextPaymentDate,
    subscriptionCode: open.subscription_code,
    customerCode: customer.customer_code,
    email: normalised,
  }
}

export async function managementLink(input: {
  email: string
  subscriptionCode: string
}): Promise<string> {
  const email = input.email.trim().toLowerCase()
  const code = input.subscriptionCode.trim()
  const status = await statusForEmail(email)
  if (!status.entitled || status.subscriptionCode !== code) {
    throw new Error('No matching subscription to manage.')
  }
  const data = await paystack<{ link: string }>(
    `/subscription/${encodeURIComponent(code)}/manage/link`,
  )
  if (!data.link) throw new Error('Could not open the billing portal.')
  return data.link
}

export function parseBody(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

export function httpErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('Missing PAYSTACK_SECRET_KEY')) return 503
  if (message.toLowerCase().includes('required')) return 400
  if (message.toLowerCase().includes('does not match')) return 403
  return 400
}
