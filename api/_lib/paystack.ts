import {
  CURRENCY,
  PLAN_AMOUNT_CENTS,
  PLAN_NAME,
  SETUP_AMOUNT_CENTS,
  TRIAL_DAYS,
  isOpenSubscription,
  keyModeFromSecret,
  periodForTrialEnd,
  trialEndFromDates,
  type PaystackDomain,
} from '../../src/lib/adminClassify.js'

const PAYSTACK_BASE = 'https://api.paystack.co'

type PaystackEnvelope<T> = {
  status: boolean
  message: string
  data: T
  meta?: {
    total?: number
    page?: number
    pageCount?: number
    next?: string | null
  }
}

export type BillingPeriod = 'trial' | 'monthly'

export type BillingStatus = {
  entitled: boolean
  willRenew: boolean
  period: BillingPeriod | 'none'
  trialEndsAt: string | null
  nextPaymentDate: string | null
  subscriptionCode: string | null
  customerCode: string | null
  email: string
}

export type PaystackCustomer = {
  id?: number
  customer_code: string
  email?: string
  domain?: string
}

export type PaystackPlan = {
  plan_code: string
  name: string
  amount: number
  interval: string
  currency: string
  domain?: string
}

type PaystackAuthorization = {
  authorization_code: string
  reusable: boolean
}

export type PaystackTransaction = {
  id: number
  status: string
  reference: string
  amount: number
  currency: string
  domain?: string
  paid_at?: string | null
  paidAt?: string | null
  created_at?: string
  createdAt?: string
  customer: PaystackCustomer
  authorization?: PaystackAuthorization
  metadata?: {
    user_id?: string
    salon_id?: string
    purpose?: string
  } | null
}

export type PaystackSubscription = {
  status: string
  subscription_code: string
  amount?: number
  domain?: string
  next_payment_date?: string
  createdAt?: string
  created_at?: string
  customer: PaystackCustomer | number
  plan: PaystackPlan | number
}

export type PaystackRefund = {
  id: number
  status: string
  amount: number
  currency?: string
  domain?: string
  transaction: number | { id?: number }
  customer?: PaystackCustomer | null
  createdAt?: string
  created_at?: string
}

export type PaystackDispute = {
  id: number
  status: string
  resolution?: string | null
  domain?: string
  amount?: number
  createdAt?: string
  created_at?: string
  customer?: PaystackCustomer | null
  transaction?: { customer?: PaystackCustomer } | null
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key) throw new Error('Missing PAYSTACK_SECRET_KEY')
  return key
}

export function paystackKeyPresent(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim())
}

export function paystackMode(): PaystackDomain | 'missing' {
  return keyModeFromSecret(process.env.PAYSTACK_SECRET_KEY)
}

async function paystackFull<T>(
  path: string,
  init: RequestInit = {},
): Promise<PaystackEnvelope<T>> {
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
  return json
}

async function paystack<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const json = await paystackFull<T>(path, init)
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
  return isOpenSubscription(status)
}

function periodFor(trialEndsAt: string | null): BillingPeriod {
  return periodForTrialEnd(trialEndsAt)
}

function trialEndFrom(sub: PaystackSubscription): string | null {
  return trialEndFromDates(
    sub.next_payment_date,
    sub.createdAt || sub.created_at,
  )
}

export async function listPaystackPages<T>(
  path: string,
  maxPages = 2,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = []
  let truncated = false
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = path.includes('?') ? '&' : '?'
    const envelope = await paystackFull<T[]>(
      `${path}${sep}perPage=50&page=${page}`,
    )
    const batch = Array.isArray(envelope.data) ? envelope.data : []
    rows.push(...batch)
    const pageCount = envelope.meta?.pageCount
    if (batch.length < 50) break
    if (page === maxPages && (pageCount ? page < pageCount : batch.length === 50)) {
      truncated = true
    }
  }
  return { rows, truncated }
}

export async function listSubscriptionsPage() {
  return listPaystackPages<PaystackSubscription>('/subscription')
}

export async function listTransactionsPage(fromIso?: string) {
  const extra = fromIso ? `?from=${encodeURIComponent(fromIso)}` : ''
  return listPaystackPages<PaystackTransaction>(`/transaction${extra}`)
}

export async function listRefundsPage() {
  return listPaystackPages<PaystackRefund>('/refund')
}

export async function listDisputesPage() {
  return listPaystackPages<PaystackDispute>('/dispute')
}

export async function listCustomersPage() {
  return listPaystackPages<PaystackCustomer>('/customer')
}

export async function listPlansPage() {
  return listPaystackPages<PaystackPlan>('/plan')
}

export function customerEmail(
  customer: PaystackCustomer | number | null | undefined,
): string {
  if (!customer || typeof customer === 'number') return ''
  return (customer.email || '').trim().toLowerCase()
}

export function customerCodeOf(
  customer: PaystackCustomer | number | null | undefined,
): string | null {
  if (!customer || typeof customer === 'number') return null
  return customer.customer_code || null
}

export function planFields(plan: PaystackSubscription['plan']): {
  name: string
  amount: number
  currency: string
  code: string | null
} {
  if (typeof plan === 'object' && plan) {
    return {
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      code: plan.plan_code,
    }
  }
  return { name: '', amount: 0, currency: '', code: null }
}

export function paystackCustomerUrl(customerCode: string | null): string | null {
  if (!customerCode) return null
  return `https://dashboard.paystack.com/#/customers/${encodeURIComponent(customerCode)}`
}

export function paystackTransactionUrl(id: number | null | undefined): string | null {
  if (!id) return null
  return `https://dashboard.paystack.com/#/transactions/${id}`
}

export async function ensurePlan(): Promise<PaystackPlan | null> {
  const listed = await listPlansPage()
  const envCode = process.env.PAYSTACK_PLAN_CODE?.trim()
  const match = listed.rows.find(
    (plan) =>
      (envCode && plan.plan_code === envCode) ||
      (plan.name === PLAN_NAME &&
        plan.amount === PLAN_AMOUNT_CENTS &&
        plan.interval === 'monthly' &&
        plan.currency === CURRENCY),
  )
  return match ?? null
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
  salonId: string
}): Promise<{ accessCode: string; reference: string }> {
  const email = input.email.trim().toLowerCase()
  const userId = input.userId.trim()
  const salonId = input.salonId.trim()
  if (!email || !userId || !salonId) {
    throw new Error('Email and account id are required.')
  }
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
          salon_id: salonId,
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
  salonId?: string
}): Promise<BillingStatus> {
  const email = input.email.trim().toLowerCase()
  const userId = input.userId.trim()
  const reference = input.reference.trim()
  if (!email || !reference) {
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
    throw new Error('This payment does not match the salon billing email.')
  }
  if (input.salonId && tx.metadata?.salon_id && tx.metadata.salon_id !== input.salonId) {
    throw new Error('This payment does not match this salon.')
  }
  if (userId && userId !== 'admin-repair' && tx.metadata?.user_id && tx.metadata.user_id !== userId) {
    throw new Error('This payment does not match the signed-in account.')
  }
  if (!tx.authorization?.authorization_code || !tx.authorization.reusable) {
    throw new Error('Use a card that can be charged monthly.')
  }
  const authorizationCode = tx.authorization.authorization_code
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
  const billed = open
    ? await statusForEmail(email)
    : await createTrialSubscription(customer, authorizationCode, email)
  const salonId = input.salonId || tx.metadata?.salon_id
  if (salonId) await setSalonBillingEmail(salonId, email)
  return billed
}

async function createTrialSubscription(
  customer: PaystackCustomer,
  authorization: string,
  email: string,
): Promise<BillingStatus> {
  const planCode = await ensurePlanCode()
  const start = addDays(TRIAL_DAYS)
  const created = await paystack<PaystackSubscription>('/subscription', {
    method: 'POST',
    body: JSON.stringify({
      customer: customer.customer_code,
      plan: planCode,
      authorization,
      start_date: start.toISOString(),
    }),
  })
  return {
    entitled: true,
    willRenew: true,
    period: 'trial',
    trialEndsAt: start.toISOString(),
    nextPaymentDate: start.toISOString(),
    subscriptionCode: created.subscription_code,
    customerCode: customer.customer_code,
    email,
  }
}

async function setSalonBillingEmail(salonId: string, email: string) {
  try {
    const { supabaseAdmin } = await import('./supabaseAdmin.js')
    const admin = supabaseAdmin()
    const { data } = await admin
      .from('salons')
      .select('billing_email')
      .eq('id', salonId)
      .maybeSingle()
    if (data?.billing_email) return
    await admin
      .from('salons')
      .update({
        billing_email: email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', salonId)
  } catch {
    // Admin repair can run without a salon row; Paystack still records the customer.
  }
}

export async function statusForEmail(email: string): Promise<BillingStatus> {
  secretKey()
  const normalised = email.trim().toLowerCase()
  const empty: BillingStatus = {
    entitled: false,
    willRenew: false,
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
    willRenew: open.status !== 'non-renewing',
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
  if (message.includes('Supabase is not configured')) return 503
  if (message.toLowerCase().includes('sign in required')) return 401
  if (message.toLowerCase().includes('the owner needs')) return 403
  if (message.toLowerCase().includes('required')) return 400
  if (message.toLowerCase().includes('does not match')) return 403
  return 400
}
