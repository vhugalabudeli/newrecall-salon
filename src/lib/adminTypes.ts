import type {
  AccessBucket,
  ChargeKind,
  DisputeBucket,
  KeyMode,
  SetupCheckState,
  SubListStatus,
} from './adminClassify.ts'

export type AdminSession = {
  email: string
}

export type AdminJumpLinks = {
  customer: string | null
  transaction: string | null
  portal: boolean
}

export type AdminSubscriptionRow = {
  email: string
  status: string
  listStatus: SubListStatus
  subscriptionCode: string
  customerCode: string | null
  nextPaymentDate: string | null
  trialEndsAt: string | null
  amountCents: number
  convertsOn: string | null
}

export type AdminTransactionRow = {
  id: number
  email: string
  status: string
  amountCents: number
  kind: ChargeKind
  reference: string
  paidAt: string | null
  createdAt: string | null
  purpose: string | null
  customerCode: string | null
}

export type AdminRefundRow = {
  id: number
  email: string
  amountCents: number
  kind: ChargeKind
  status: string
  transactionId: number | null
  createdAt: string | null
}

export type AdminDisputeRow = {
  id: number
  email: string
  status: string
  bucket: DisputeBucket
  amountCents: number | null
  createdAt: string | null
}

export type AdminSetupCheckRow = {
  email: string
  reference: string
  state: SetupCheckState
  amountCents: number
}

export type AdminStuckRow = {
  email: string
  reference: string
  userId: string | null
  amountCents: number
}

export type AdminSupportNote = {
  id: string
  createdAt: string
  operatorEmail: string
  kind: 'book_locked' | 'billing'
  email: string
  note: string
}

export type AdminAuditEntry = {
  id: string
  at: string
  operatorEmail: string
  action: string
  detail: string
}

export type AdminLookup = {
  email: string
  period: 'trial' | 'monthly' | 'none'
  entitled: boolean
  nextCharge: string | null
  trialEndsAt: string | null
  customerCode: string | null
  subscriptionCode: string | null
  subscriptionStatus: string | null
  jumps: AdminJumpLinks
}

export type AdminOverview = {
  truncated: boolean
  mode: KeyMode
  liveKeyPresent: boolean
  paystackConfigured: boolean
  paystackError: string | null
  activation: {
    status: 'test' | 'approved' | 'awaiting_review' | 'unknown'
    liveCards: boolean
  }
  plan: {
    exists: boolean
    nameOk: boolean
    amountOk: boolean
    currencyOk: boolean
    code: string | null
    name: string
    amountCents: number
    currency: string
  }
  money30d: {
    grossCents: number
    refundCents: number
    netCents: number
    currency: 'ZAR'
  }
  accessCounts: Record<AccessBucket, number>
  entitledEmails: string[]
  subscriptions: AdminSubscriptionRow[]
  trialClock: AdminSubscriptionRow[]
  setupChecks: AdminSetupCheckRow[]
  transactions: AdminTransactionRow[]
  refunds: AdminRefundRow[]
  disputes: AdminDisputeRow[]
  failedRenewals: Array<{
    email: string
    reason: string
    reference: string | null
    subscriptionCode: string | null
  }>
  abandoned: AdminTransactionRow[]
  stuckEntitlement: AdminStuckRow[]
    tenants: Array<{
      salonId: string
      salonName: string
      ownerEmail: string
      plan: string
      lastBackupAt: string | null
      lastRestoreAt: string | null
    }>
  backups: {
    lastBackupAt: string | null
    lastBackupResult: 'ok' | 'fail' | null
    lastBackupSize: string | null
    nextScheduledBackup: string | null
    pointInTimeWindow: string | null
    lastRestoreDrill: { at: string; result: 'pass' | 'fail' } | null
    dailyStatus: 'running' | 'paused'
    retentionDays: number | null
    storageHealthy: boolean | null
    missedBackup: boolean
    exportEnabled: boolean
    restoreEnabled: boolean
  }
  redis: {
    available: boolean
    storageHealthy: boolean | null
  }
  support: AdminSupportNote[]
  audit: AdminAuditEntry[]
}
