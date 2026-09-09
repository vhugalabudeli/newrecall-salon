import {
  CURRENCY,
  PLAN_AMOUNT_CENTS,
  PLAN_NAME,
  billingCsvLine,
  chargeKind,
  disputeBucket,
  isFailedRenewal,
  isOpenSubscription,
  isSetupCharge,
  isStuckEntitlement,
  moneyTotals,
  pickAccessBucket,
  rowMatchesMode,
  setupCheckState,
  subscriptionListStatus,
  trialEndFromDates,
  isActivationReviewError,
} from '../../src/lib/adminClassify.js'
import type {
  AccessBucket,
  PaystackDomain,
} from '../../src/lib/adminClassify.js'
import type {
  AdminLookup,
  AdminOverview,
  AdminRefundRow,
  AdminStuckRow,
  AdminSubscriptionRow,
  AdminTransactionRow,
} from '../../src/lib/adminTypes.js'
import { listAudit, listSupportNotes, redisHealth } from './adminOps.js'
import { listTenants, salonCloudConfigured } from './salonBook.js'
import {
  completeTrial,
  customerCodeOf,
  customerEmail,
  ensurePlan,
  listCustomersPage,
  listDisputesPage,
  listPlansPage,
  listRefundsPage,
  listSubscriptionsPage,
  listTransactionsPage,
  managementLink,
  paystackCustomerUrl,
  paystackKeyPresent,
  paystackMode,
  paystackTransactionUrl,
  planFields,
  statusForEmail,
  type PaystackRefund,
  type PaystackSubscription,
  type PaystackTransaction,
} from './paystack.js'

function modeFilter(domain: string | undefined, mode: PaystackDomain): boolean {
  return rowMatchesMode(domain, mode)
}

function subEmail(row: PaystackSubscription): string {
  return customerEmail(row.customer)
}

function txMetaPurpose(tx: PaystackTransaction): string | null {
  const purpose = tx.metadata?.purpose
  return typeof purpose === 'string' ? purpose : null
}

function refundTxId(row: PaystackRefund): number | null {
  if (typeof row.transaction === 'number') return row.transaction
  return row.transaction?.id ?? null
}

function toSubRow(
  row: PaystackSubscription,
  now: number,
): AdminSubscriptionRow {
  const trialEndsAt = trialEndFromDates(
    row.next_payment_date,
    row.createdAt || row.created_at,
  )
  const plan = planFields(row.plan)
  const next = row.next_payment_date
    ? new Date(row.next_payment_date).toISOString()
    : null
  const inTrial = subscriptionListStatus(row.status, trialEndsAt, now) === 'trial'
  return {
    email: subEmail(row),
    status: row.status,
    listStatus: subscriptionListStatus(row.status, trialEndsAt, now),
    subscriptionCode: row.subscription_code,
    customerCode: customerCodeOf(row.customer),
    nextPaymentDate: next,
    trialEndsAt,
    amountCents: plan.amount || row.amount || PLAN_AMOUNT_CENTS,
    convertsOn: inTrial ? trialEndsAt || next : null,
  }
}

function toTxRow(tx: PaystackTransaction): AdminTransactionRow {
  const purpose = txMetaPurpose(tx)
  return {
    id: tx.id,
    email: customerEmail(tx.customer),
    status: tx.status,
    amountCents: tx.amount,
    kind: chargeKind(tx.amount),
    reference: tx.reference,
    paidAt: tx.paid_at || tx.paidAt || null,
    createdAt: tx.created_at || tx.createdAt || null,
    purpose,
    customerCode: customerCodeOf(tx.customer),
  }
}

function emptyOverview(): AdminOverview {
  return {
    truncated: false,
    mode: 'missing',
    liveKeyPresent: false,
    paystackConfigured: false,
    paystackError: null,
    activation: { status: 'unknown', liveCards: false },
    plan: {
      exists: false,
      nameOk: false,
      amountOk: false,
      currencyOk: false,
      code: null,
      name: PLAN_NAME,
      amountCents: PLAN_AMOUNT_CENTS,
      currency: CURRENCY,
    },
    money30d: { grossCents: 0, refundCents: 0, netCents: 0, currency: 'ZAR' },
    accessCounts: { none: 0, trial: 0, paid: 0, cancelled: 0 },
    entitledEmails: [],
    subscriptions: [],
    trialClock: [],
    setupChecks: [],
    transactions: [],
    refunds: [],
    disputes: [],
    failedRenewals: [],
    abandoned: [],
    stuckEntitlement: [],
    tenants: [],
    backups: {
      lastBackupAt: null,
      lastBackupResult: null,
      lastBackupSize: null,
      nextScheduledBackup: null,
      pointInTimeWindow: null,
      lastRestoreDrill: null,
      dailyStatus: 'paused',
      retentionDays: null,
      storageHealthy: null,
      missedBackup: false,
      exportEnabled: false,
      restoreEnabled: false,
    },
    redis: { available: false, storageHealthy: null },
    support: [],
    audit: [],
  }
}

export async function assembleOverview(): Promise<AdminOverview> {
  const overview = emptyOverview()
  const redis = await redisHealth()
  overview.redis = redis
  overview.backups.storageHealthy = redis.storageHealthy
  overview.support = await listSupportNotes()
  overview.audit = await listAudit()
  const cloud = salonCloudConfigured()
  overview.backups.exportEnabled = cloud
  overview.backups.restoreEnabled = cloud
  overview.backups.dailyStatus = cloud ? 'running' : 'paused'
  overview.backups.pointInTimeWindow = cloud
    ? 'Supabase point-in-time recovery, when enabled for the project'
    : null
  overview.backups.lastBackupResult = cloud ? 'ok' : null
  if (cloud) overview.backups.storageHealthy = true
  try {
    overview.tenants = await listTenants()
  } catch (error) {
    overview.paystackError =
      overview.paystackError ||
      (error instanceof Error ? error.message : 'Salon account information could not be loaded.')
  }

  const mode = paystackMode()
  overview.mode = mode
  overview.liveKeyPresent = mode === 'live'
  if (mode === 'missing' || !paystackKeyPresent()) {
    overview.paystackError = 'Paystack secret key is not set.'
    overview.activation = { status: 'unknown', liveCards: false }
    return overview
  }

  const domain = mode
  overview.paystackConfigured = true
  const from30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const now = Date.now()

  try {
    const [subs, txns, refunds, disputes, customers, plan] = await Promise.all([
      listSubscriptionsPage(),
      listTransactionsPage(),
      listRefundsPage(),
      listDisputesPage(),
      listCustomersPage(),
      ensurePlan().catch(() => null),
    ])

    overview.truncated = [
      subs.truncated,
      txns.truncated,
      refunds.truncated,
      disputes.truncated,
      customers.truncated,
    ].some(Boolean)

    overview.activation = {
      status: domain === 'live' ? 'approved' : 'test',
      liveCards: domain === 'live',
    }

    if (plan) {
      overview.plan = {
        exists: true,
        nameOk: plan.name === PLAN_NAME,
        amountOk: plan.amount === PLAN_AMOUNT_CENTS,
        currencyOk: plan.currency === CURRENCY,
        code: plan.plan_code,
        name: plan.name,
        amountCents: plan.amount,
        currency: plan.currency,
      }
    } else {
      const listed = await listPlansPage().catch(() => ({ rows: [] }))
      const any = listed.rows[0]
      overview.plan = {
        exists: false,
        nameOk: false,
        amountOk: false,
        currencyOk: false,
        code: process.env.PAYSTACK_PLAN_CODE?.trim() || any?.plan_code || null,
        name: PLAN_NAME,
        amountCents: PLAN_AMOUNT_CENTS,
        currency: CURRENCY,
      }
    }

    const subRows = subs.rows.filter((row) => modeFilter(row.domain, domain))
    const txRows = txns.rows.filter((row) => modeFilter(row.domain, domain))
    const refundRows = refunds.rows.filter((row) => modeFilter(row.domain, domain))
    const disputeRows = disputes.rows.filter((row) =>
      modeFilter(row.domain, domain),
    )
    const customerRows = customers.rows.filter((row) =>
      modeFilter(row.domain, domain),
    )

    const mappedSubs = subRows.map((row) => toSubRow(row, now))
    overview.subscriptions = mappedSubs
    overview.trialClock = mappedSubs.filter((row) => row.listStatus === 'trial')

    const mappedTx = txRows.map(toTxRow)
    overview.transactions = mappedTx
    overview.abandoned = mappedTx.filter((row) => row.status === 'abandoned')

    const refundMapped: AdminRefundRow[] = refundRows.map((row) => ({
      id: row.id,
      email: customerEmail(row.customer),
      amountCents: row.amount,
      kind: chargeKind(row.amount),
      status: row.status,
      transactionId: refundTxId(row),
      createdAt: row.createdAt || row.created_at || null,
    }))
    overview.refunds = refundMapped

    const refundedTxIds = new Set(
      refundMapped
        .filter(
          (row) =>
            row.transactionId !== null &&
            (row.status === 'processed' || row.status === 'success'),
        )
        .map((row) => row.transactionId as number),
    )
    const failedRefundTxIds = new Set(
      refundMapped
        .filter(
          (row) =>
            row.transactionId !== null &&
            (row.status === 'failed' || row.status === 'rejected'),
        )
        .map((row) => row.transactionId as number),
    )

    overview.setupChecks = mappedTx
      .filter((row) =>
        isSetupCharge(row.amountCents, row.purpose ?? undefined),
      )
      .filter((row) => row.status === 'success' || row.status === 'reversed')
      .map((row) => {
        const state =
          row.status === 'reversed'
            ? 'refunded'
            : (setupCheckState({
                txStatus: 'success',
                hasRefund: refundedTxIds.has(row.id),
                refundFailed: failedRefundTxIds.has(row.id),
              }) ?? 'succeeded')
        return {
          email: row.email,
          reference: row.reference,
          state,
          amountCents: row.amountCents,
        }
      })

    overview.disputes = disputeRows.map((row) => ({
      id: row.id,
      email: customerEmail(row.customer ?? row.transaction?.customer),
      status: row.status,
      bucket: disputeBucket(row.status, row.resolution),
      amountCents: row.amount ?? null,
      createdAt: row.createdAt || row.created_at || null,
    }))

    overview.failedRenewals = [
      ...mappedSubs
        .filter((row) => isFailedRenewal({ subStatus: row.status }))
        .map((row) => ({
          email: row.email,
          reason: 'Card declined. Confirm that the subscription is active to preserve the customer’s app access.',
          reference: null as string | null,
          subscriptionCode: row.subscriptionCode,
        })),
      ...mappedTx
        .filter((row) =>
          isFailedRenewal({ txStatus: row.status, amountCents: row.amountCents }),
        )
        .map((row) => ({
          email: row.email,
          reason: 'Monthly charge failed.',
          reference: row.reference,
          subscriptionCode: null as string | null,
        })),
    ]

    const openByEmail = new Set(
      mappedSubs.filter((row) => isOpenSubscription(row.status)).map((row) => row.email),
    )
    overview.entitledEmails = [...openByEmail].filter(Boolean).sort()

    const stuck: AdminStuckRow[] = mappedTx
      .filter(
        (row) =>
          row.status === 'success' &&
          isSetupCharge(row.amountCents, row.purpose ?? undefined) &&
          isStuckEntitlement({
            setupSuccess: true,
            hasOpenSubscription: openByEmail.has(row.email),
          }),
      )
      .map((row) => ({
        email: row.email,
        reference: row.reference,
        userId: txRows.find((raw) => raw.reference === row.reference)?.metadata?.user_id ?? null,
        amountCents: row.amountCents,
      }))
    overview.stuckEntitlement = stuck

    const byEmail = new Map<string, Array<{ status: string; trialEndsAt: string | null }>>()
    for (const row of mappedSubs) {
      if (!row.email) continue
      const list = byEmail.get(row.email) ?? []
      list.push({ status: row.status, trialEndsAt: row.trialEndsAt })
      byEmail.set(row.email, list)
    }
    const counts: Record<AccessBucket, number> = {
      none: 0,
      trial: 0,
      paid: 0,
      cancelled: 0,
    }
    const seen = new Set<string>()
    for (const customer of customerRows) {
      const email = (customer.email || '').trim().toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      const bucket = pickAccessBucket(byEmail.get(email) ?? [])
      counts[bucket] += 1
    }
    for (const [email, rows] of byEmail) {
      if (seen.has(email) || !email) continue
      counts[pickAccessBucket(rows)] += 1
    }
    overview.accessCounts = counts

    const since = Date.parse(from30)
    const gross = mappedTx
      .filter((row) => {
        if (row.status !== 'success' || row.kind === 'r1') return false
        const at = Date.parse(row.paidAt || row.createdAt || '')
        return !Number.isNaN(at) && at >= since
      })
      .reduce((sum, row) => sum + row.amountCents, 0)
    const refunded = refundMapped
      .filter((row) => {
        if (row.kind === 'r1') return false
        const at = Date.parse(row.createdAt || '')
        return !Number.isNaN(at) && at >= since
      })
      .reduce((sum, row) => sum + row.amountCents, 0)
    overview.money30d = { ...moneyTotals(gross, refunded), currency: 'ZAR' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Paystack information could not be loaded. Try again.'
    overview.paystackError = message
    if (domain === 'live' && isActivationReviewError(message)) {
      overview.activation = { status: 'awaiting_review', liveCards: false }
    } else if (domain === 'live') {
      overview.activation = { status: 'unknown', liveCards: false }
    } else {
      overview.activation = { status: 'test', liveCards: false }
    }
  }

  return overview
}

export async function lookupEmail(email: string): Promise<AdminLookup> {
  const normalised = email.trim().toLowerCase()
  const status = await statusForEmail(normalised)
  return {
    email: normalised,
    period: status.period,
    entitled: status.entitled,
    nextCharge: status.nextPaymentDate,
    trialEndsAt: status.trialEndsAt,
    customerCode: status.customerCode,
    subscriptionCode: status.subscriptionCode,
    subscriptionStatus: status.entitled
      ? status.period === 'trial'
        ? 'trial'
        : 'active'
      : status.customerCode
        ? 'none'
        : 'none',
    jumps: {
      customer: paystackCustomerUrl(status.customerCode),
      transaction: null,
      portal: Boolean(status.subscriptionCode),
    },
  }
}

export async function repairStuck(input: {
  email: string
  reference: string
  userId?: string
}) {
  const email = input.email.trim().toLowerCase()
  const userId = input.userId?.trim() || 'admin-repair'
  return completeTrial({
    email,
    reference: input.reference.trim(),
    userId,
  })
}

export async function portalFor(email: string, subscriptionCode: string) {
  return managementLink({ email, subscriptionCode })
}

export function billingCsv(overview: AdminOverview): string {
  const header = 'email,plan,amount,reference'
  const lines = overview.transactions
    .filter((row) => row.status === 'success' || row.status === 'failed')
    .map((row) =>
      billingCsvLine({
        email: row.email,
        plan: row.kind === 'r1' ? 'Card verification' : PLAN_NAME,
        amountCents: row.amountCents,
        reference: row.reference,
      }),
    )
  return [header, ...lines].join('\n')
}

export { paystackCustomerUrl, paystackTransactionUrl }
