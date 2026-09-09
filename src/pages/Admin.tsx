import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { format } from 'date-fns'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  addAdminSupport,
  adminLogin,
  adminLogout,
  downloadBillingCsv,
  exportAdminTenant,
  fetchAdminLookup,
  fetchAdminOverview,
  fetchAdminSession,
  openAdminPortal,
  repairAdminCheckout,
  restoreAdminTenant,
} from '../lib/adminApi'
import { formatZarFromCents } from '../lib/adminClassify'
import type { AdminLookup, AdminOverview } from '../lib/adminTypes'
import { DEFAULT_MESSAGE_TEMPLATE } from '../lib/messageTemplate'
import { paths } from '../lib/routes'

const SECTIONS = [
  { id: 'lookup', label: 'Lookup' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'trial-clock', label: 'Trials ending soon' },
  { id: 'r1', label: 'Card verification' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'failed-renewals', label: 'Failed renewals' },
  { id: 'abandoned', label: 'Incomplete checkouts' },
  { id: 'money', label: '30-day revenue' },
  { id: 'entitlement', label: 'Access mismatches' },
  { id: 'who-has-app', label: 'App access' },
  { id: 'health', label: 'Health' },
  { id: 'legal', label: 'Site legal' },
  { id: 'recall', label: 'Follow-up message' },
  { id: 'tenants', label: 'Salons' },
  { id: 'backups', label: 'Backups' },
  { id: 'support', label: 'Support' },
] as const

function when(iso: string | null | undefined): string {
  if (!iso) return '—'
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return '—'
  return format(at, 'd MMM yyyy, HH:mm')
}

export function Admin() {
  useDocumentTitle('NewRecall operations')
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void fetchAdminSession()
      .then((session) => setEmail(session.email))
      .catch(() => setEmail(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="min-h-svh bg-cream px-4 py-16 text-center text-sm text-cocoa-soft">
        Loading…
      </div>
    )
  }

  if (!email) {
    return (
      <AdminLogin
        onSignedIn={(next) => setEmail(next)}
      />
    )
  }

  return (
    <AdminDesk
      operatorEmail={email}
      onSignOut={() => setEmail(null)}
    />
  )
}

function AdminLogin({
  onSignedIn,
}: {
  onSignedIn: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const session = await adminLogin(email, password)
      onSignedIn(session.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-cream px-4 py-16 text-cocoa">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-ivory p-6 ring-1 ring-line">
        <p className="text-sm font-medium text-blush-dark">NewRecall</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">NewRecall operations</h1>
        <p className="mt-2 text-sm text-cocoa-soft">
          Sign in to manage billing, service health, customer access, and support.
          Salon accounts cannot sign in here.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-blush"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-blush"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-overdue">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-blush px-3 py-2.5 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminDesk({
  operatorEmail,
  onSignOut,
}: {
  operatorEmail: string
  onSignOut: () => void
}) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookup, setLookup] = useState<AdminLookup | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [legal, setLegal] = useState<Array<{ path: string; ok: boolean }>>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const restoreInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    const data = await fetchAdminOverview()
    setOverview(data)
    setSelectedTenantId((current) => current || data.tenants[0]?.salonId || '')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'The operations overview could not be loaded. Try refreshing the page.')
      })
    }, 0)
    void Promise.all(
      [paths.terms, paths.refunds, paths.pricing].map(async (path) => {
        try {
          const res = await fetch(path, { method: 'GET' })
          return { path, ok: res.ok }
        } catch {
          return { path, ok: false }
        }
      }),
    ).then(setLegal)
    return () => window.clearTimeout(timer)
  }, [])

  const modeLabel = useMemo(() => {
    if (!overview) return ''
    if (overview.mode === 'live') return 'Live key — live totals only'
    if (overview.mode === 'test') return 'Test mode — figures shown are test transactions only'
    return 'Paystack is not configured'
  }, [overview])

  async function onLookup(event: FormEvent) {
    event.preventDefault()
    setLookupError(null)
    try {
      setLookup(await fetchAdminLookup(lookupEmail))
    } catch (err) {
      setLookup(null)
      setLookupError(err instanceof Error ? err.message : 'The customer lookup could not be completed. Try again.')
    }
  }

  async function onRepair(email: string, reference: string, userId?: string | null) {
    setBusy(`repair:${reference}`)
    try {
      await repairAdminCheckout({
        email,
        reference,
        userId: userId ?? undefined,
      })
      await refresh()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'App access could not be repaired. Review the payment and try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onPortal(email: string, subscriptionCode: string) {
    setBusy(`portal:${subscriptionCode}`)
    try {
      const link = await openAdminPortal({ email, subscriptionCode })
      window.open(link, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The Paystack billing page could not be opened. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onCsv() {
    setBusy('csv')
    try {
      await downloadBillingCsv()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The billing report could not be downloaded. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onTenantExport() {
    if (!selectedTenantId) return
    setBusy('tenant-export')
    try {
      await exportAdminTenant(selectedTenantId)
      await refresh()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The selected salon backup could not be downloaded. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onTenantRestore(file: File | undefined) {
    if (!file || !selectedTenantId) return
    const confirmed = window.confirm(
      'Restoring this backup replaces the selected salon’s clients, notes, and services. Continue?',
    )
    if (!confirmed) return
    setBusy('tenant-restore')
    try {
      const raw = JSON.parse(await file.text()) as unknown
      await restoreAdminTenant(selectedTenantId, raw)
      await refresh()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The salon backup could not be restored. Check the file and try again.')
    } finally {
      setBusy(null)
    }
  }

  async function onSupport(event: FormEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    setBusy('support')
    try {
      const result = await addAdminSupport({
        kind: data.get('kind') === 'billing' ? 'billing' : 'book_locked',
        email: String(data.get('email') || ''),
        note: String(data.get('note') || ''),
      })
      setNote(result.stored ? 'Support note saved.' : result.error || 'The support note could not be saved.')
      form.reset()
      await refresh()
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'The support note could not be saved. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function signOut() {
    await adminLogout().catch(() => undefined)
    onSignOut()
  }

  if (!overview) {
    return (
      <div className="min-h-svh bg-cream px-4 py-16 text-center text-sm text-cocoa-soft">
        {loadError ?? 'Loading NewRecall operations…'}
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-cream text-cocoa">
      <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-blush-dark">
              NewRecall operations
            </p>
            <p className="text-sm text-cocoa-soft">{operatorEmail}</p>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-blush-dark hover:underline"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full bg-cream px-3 py-1 text-cocoa-soft ring-1 ring-line hover:bg-rose-mist"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Banner
          title={modeLabel}
          body={
            overview.truncated
              ? 'Showing the latest pages from Paystack. Older rows may be missing.'
              : overview.paystackError ||
                'Test and live money are never mixed. Card numbers are not shown.'
          }
          tone={overview.mode === 'live' ? 'ok' : 'warn'}
        />
        {loadError ? <p className="text-sm text-overdue">{loadError}</p> : null}

        <Section id="lookup" title="Lookup by email">
          <form className="flex flex-wrap gap-2" onSubmit={(event) => void onLookup(event)}>
            <input
              className="min-w-56 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-blush"
              type="email"
              placeholder="salon@example.com"
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
              required
            />
            <button className={btnClass} type="submit">
              Look up
            </button>
          </form>
          {lookupError ? <p className="mt-2 text-sm text-overdue">{lookupError}</p> : null}
          {lookup ? (
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <Fact label="Plan" value={lookup.period} />
              <Fact label="App access" value={lookup.entitled ? 'Active' : 'Inactive — subscription required'} />
              <Fact label="Next charge" value={when(lookup.nextCharge)} />
              <Fact label="Trial ends" value={when(lookup.trialEndsAt)} />
              <Fact label="Customer" value={lookup.customerCode || '—'} />
              <Fact label="Subscription" value={lookup.subscriptionCode || '—'} />
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                {lookup.jumps.customer ? (
                  <Out href={lookup.jumps.customer}>Paystack customer</Out>
                ) : null}
                {lookup.subscriptionCode ? (
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() =>
                      void onPortal(lookup.email, lookup.subscriptionCode as string)
                    }
                    disabled={busy !== null}
                  >
                    Billing portal
                  </button>
                ) : null}
              </div>
            </dl>
          ) : null}
        </Section>

        <Section id="subscriptions" title="Subscription list">
          <p className="mb-3 text-sm text-cocoa-soft">
            Active, trial, past due, cancelled, and non-renewing.
          </p>
          <Table
            columns={['Email', 'Status', 'Next charge', 'Code', 'Jump']}
            rows={overview.subscriptions.map((row) => [
              row.email,
              row.listStatus.replaceAll('_', ' '),
              when(row.nextPaymentDate),
              row.subscriptionCode,
              row.customerCode ? (
                <span key={row.subscriptionCode} className="flex flex-wrap gap-2">
                  <Out href={`https://dashboard.paystack.com/#/customers/${row.customerCode}`}>
                    Customer
                  </Out>
                  <button
                    type="button"
                    className="text-sm font-medium text-blush-dark hover:underline"
                    onClick={() => void onPortal(row.email, row.subscriptionCode)}
                  >
                    Portal
                  </button>
                </span>
              ) : (
                '—'
              ),
            ])}
          />
        </Section>

        <Section id="trial-clock" title="Trials ending soon">
          <p className="mb-3 text-sm text-cocoa-soft">
            Trial customers and the date each subscription begins at R200 per month.
          </p>
          <Table
            columns={['Email', 'Converts on', 'Amount']}
            rows={overview.trialClock.map((row) => [
              row.email,
              when(row.convertsOn),
              formatZarFromCents(row.amountCents),
            ])}
          />
        </Section>

        <Section id="r1" title="Card verification transactions">
          <Table
            columns={['Email', 'Reference', 'State']}
            rows={overview.setupChecks.map((row) => [
              row.email,
              row.reference,
              row.state,
            ])}
          />
        </Section>

        <Section id="transactions" title="Transactions">
          <Table
            columns={['Email', 'Status', 'Amount', 'Reference']}
            rows={overview.transactions.map((row) => [
              row.email,
              row.status,
              formatZarFromCents(row.amountCents),
              row.reference,
            ])}
          />
        </Section>

        <Section id="refunds" title="Refunds">
          <p className="mb-3 text-sm text-cocoa-soft">R1 card-verification refunds and R200 monthly subscription refunds.</p>
          <Table
            columns={['Email', 'Kind', 'Amount', 'Status']}
            rows={overview.refunds.map((row) => [
              row.email,
              row.kind,
              formatZarFromCents(row.amountCents),
              row.status,
            ])}
          />
        </Section>

        <Section id="disputes" title="Disputes / chargebacks">
          <Table
            columns={['Email', 'Bucket', 'Status']}
            rows={overview.disputes.map((row) => [
              row.email || '—',
              row.bucket,
              row.status,
            ])}
          />
        </Section>

        <Section id="failed-renewals" title="Failed renewals">
          <p className="mb-3 text-sm text-cocoa-soft">
            Renewals that failed. App access ends when the customer no longer has an active billing period.
          </p>
          <Table
            columns={['Email', 'Reason', 'Reference']}
            rows={overview.failedRenewals.map((row) => [
              row.email,
              row.reason,
              row.reference || row.subscriptionCode || '—',
            ])}
          />
        </Section>

        <Section id="abandoned" title="Incomplete checkouts">
          <Table
            columns={['Email', 'Amount', 'Reference']}
            rows={overview.abandoned.map((row) => [
              row.email,
              formatZarFromCents(row.amountCents),
              row.reference,
            ])}
          />
        </Section>

        <Section id="money" title="Revenue in the last 30 days">
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <Fact label="Gross" value={formatZarFromCents(overview.money30d.grossCents)} />
            <Fact label="Refunds" value={formatZarFromCents(overview.money30d.refundCents)} />
            <Fact label="Net" value={formatZarFromCents(overview.money30d.netCents)} />
          </dl>
          <button className={`${btnClass} mt-4`} type="button" onClick={() => void onCsv()}>
            Download billing CSV
          </button>
        </Section>

        <Section id="entitlement" title="Payment and access mismatches">
          <p className="mb-3 text-sm text-cocoa-soft">
            Successful Paystack payments that did not activate app access. Use Repair to retry activation.
          </p>
          <Table
            columns={['Email', 'Reference', 'Repair']}
            rows={overview.stuckEntitlement.map((row) => [
              row.email,
              row.reference,
              <button
                key={row.reference}
                type="button"
                className={btnClass}
                disabled={busy !== null}
                onClick={() => void onRepair(row.email, row.reference, row.userId)}
              >
                {busy === `repair:${row.reference}` ? 'Repairing…' : 'Repair'}
              </button>,
            ])}
          />
        </Section>

        <Section id="who-has-app" title="Customers with app access">
          <p className="mb-3 text-sm text-cocoa-soft">
            Accounts with access now: {overview.entitledEmails.length}. Subscription status:
            no plan {overview.accessCounts.none}, trial {overview.accessCounts.trial}, paid{' '}
            {overview.accessCounts.paid}, cancelled {overview.accessCounts.cancelled}.
          </p>
          <Table
            columns={['Email']}
            rows={overview.entitledEmails.map((email) => [email])}
          />
        </Section>

        <Section id="health" title="Paystack and plan health">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Fact
              label="Secret key"
              value={
                overview.liveKeyPresent
                  ? 'Production has a live key'
                  : overview.mode === 'test'
                    ? 'Test key configured — production payments are unavailable'
                    : 'Paystack secret key is not configured'
              }
            />
            <Fact
              label="Activation"
              value={
                overview.activation.status === 'approved'
                  ? 'Approved for production payments'
                  : overview.activation.status === 'awaiting_review'
                    ? 'Awaiting Paystack review'
                    : overview.activation.status === 'test'
                      ? 'Test mode — production payments are unavailable'
                      : 'Activation status is unavailable'
              }
            />
            <Fact
              label="Plan"
              value={
                overview.plan.exists
                  ? `${overview.plan.name} · ${formatZarFromCents(overview.plan.amountCents)} ${overview.plan.currency} · ${overview.plan.code}`
                  : `Missing ${PLAN_HINT}`
              }
            />
            <Fact
              label="Plan checks"
              value={`Plan name: ${overview.plan.nameOk ? 'correct' : 'needs attention'} · Price: ${overview.plan.amountOk ? 'R200 confirmed' : 'needs attention'} · Currency: ${overview.plan.currencyOk ? 'ZAR confirmed' : 'needs attention'} · Plan code: ${overview.plan.code ? 'available' : 'missing'}`}
            />
          </dl>
        </Section>

        <Section id="legal" title="Site legal">
          <ul className="text-sm">
            {legal.map((row) => (
              <li key={row.path}>
                {row.path} — {row.ok ? 'reachable' : 'not reachable'}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="recall" title="Default client follow-up message">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-cream p-3 text-sm">
            {DEFAULT_MESSAGE_TEMPLATE}
          </pre>
        </Section>

        <Section id="tenants" title="Salon accounts">
          <p className="text-sm text-cocoa-soft">
            This table shows the salon name, owner email, and plan only. Client details are never shown in
            this table.
          </p>
          <Table
            columns={['Salon', 'Owner email', 'Plan', 'Last export', 'Last restore']}
            rows={overview.tenants.map((row) => [
              <label key={row.salonId} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tenant"
                  checked={selectedTenantId === row.salonId}
                  onChange={() => setSelectedTenantId(row.salonId)}
                />
                {row.salonName}
              </label>,
              row.ownerEmail,
              row.plan,
              when(row.lastBackupAt),
              when(row.lastRestoreAt),
            ])}
          />
        </Section>

        <Section id="backups" title="Salon backups">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Fact
              label="Platform backups"
              value={
                overview.backups.exportEnabled
                  ? 'Supabase project backups with point-in-time recovery'
                  : 'Supabase backup access is not configured'
              }
            />
            <Fact
              label="Point-in-time window"
              value={overview.backups.pointInTimeWindow || '—'}
            />
            <Fact
              label="Daily backup status"
              value={overview.backups.dailyStatus === 'running' ? 'On (Supabase)' : 'Paused'}
            />
            <Fact
              label="Storage healthy"
              value={
                overview.backups.storageHealthy === true
                  ? 'Yes'
                  : overview.backups.storageHealthy === false
                    ? 'No'
                    : 'Unknown'
              }
            />
            <Fact
              label="Salon backup export"
              value={overview.backups.exportEnabled ? 'Available' : 'Not configured'}
            />
            <Fact
              label="Salon backup restore"
              value={overview.backups.restoreEnabled ? 'Available' : 'Not configured'}
            />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnClass}
              disabled={!overview.backups.exportEnabled || !selectedTenantId || busy !== null}
              onClick={() => void onTenantExport()}
            >
              Export selected salon
            </button>
            <button
              type="button"
              className={btnClass}
              disabled={!overview.backups.restoreEnabled || !selectedTenantId || busy !== null}
              onClick={() => restoreInputRef.current?.click()}
            >
              Restore selected salon
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void onTenantRestore(file)
              }}
            />
          </div>
          <p className="mt-2 text-sm text-cocoa-soft">
            Export uses the same backup format as Settings. Restore replaces the selected salon’s
            client data after confirmation and records the administrator, time, and salon in the audit log.
          </p>
        </Section>

        <Section id="support" title="Support queue">
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => void onSupport(event)}>
            <label className="text-sm">
              Kind
              <select
                name="kind"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              >
                <option value="book_locked">App access issue</option>
                <option value="billing">Billing issue</option>
              </select>
            </label>
            <label className="text-sm">
              Billing email
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Short internal note
              <input
                name="note"
                required
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            <button className={btnClass} type="submit" disabled={busy !== null}>
              Add note
            </button>
          </form>
          {note ? <p className="mt-2 text-sm text-cocoa-soft">{note}</p> : null}
          {!overview.redis.available ? (
            <p className="mt-2 text-sm text-cocoa-soft">
              Support notes and audit history cannot be stored because Redis is not configured.
            </p>
          ) : null}
          <h3 className="mt-4 text-sm font-medium">Notes</h3>
          <Table
            columns={['When', 'Kind', 'Email', 'Note']}
            rows={overview.support.map((row) => [
              when(row.createdAt),
              row.kind === 'book_locked' ? 'App access issue' : 'Billing issue',
              row.email,
              row.note,
            ])}
          />
          <h3 className="mt-4 text-sm font-medium">Audit log</h3>
          <Table
            columns={['When', 'Who', 'Action', 'Detail']}
            rows={overview.audit.map((row) => [
              when(row.at),
              row.operatorEmail,
              row.action,
              row.detail,
            ])}
          />
        </Section>
      </main>
    </div>
  )
}

const PLAN_HINT = 'the NewRecall Salon Monthly plan at R200 in ZAR with a valid plan code'
const btnClass =
  'rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40'

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl bg-ivory p-4 ring-1 ring-line">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Banner({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone: 'ok' | 'warn'
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        tone === 'ok' ? 'bg-ivory ring-line' : 'bg-rose-mist/60 ring-line'
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-cocoa-soft">{body}</p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-cocoa-soft">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-blush-dark hover:underline"
    >
      {children}
    </a>
  )
}

function Table({
  columns,
  rows,
}: {
  columns: string[]
  rows: ReactNode[][]
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-cocoa-soft">None.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-cocoa-soft">
            {columns.map((col) => (
              <th key={col} className="py-2 pr-3 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line/70 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
