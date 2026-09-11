import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { fieldActionClassName } from '../components/ClientUpdateFields'
import { AppPage } from '../components/AppPage'
import { PageHeader } from '../components/PageHeader'
import { Switch } from '../components/Switch'
import { useAuth } from '../hooks/useAuth'
import { useAlertPrefs } from '../hooks/useAlertPrefs'
import { useSalonName } from '../hooks/useSalonName'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import { useSubscription } from '../hooks/useSubscription'
import { logoutTo } from '../lib/auth'
import { readAlertPrefs, writeAlertPrefs } from '../lib/alertPrefs'
import {
  accessLabel,
  fetchBillingStatus,
  openBillingPortal,
  paywallBypassed,
} from '../lib/billing'
import {
  exportBook,
  importBook,
  lastExportLabel,
  readLastExportAt,
} from '../lib/bookBackup'
import {
  ensureNotificationPermission,
  notificationPermissionMessage,
  type NotificationPermissionResult,
} from '../lib/notifications'
import { sendTestNotification } from '../lib/recallAlerts'
import {
  fetchPushConfig,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../lib/pushAlerts'
import { showLiveAlert } from '../lib/liveAlert'
import { paths } from '../lib/routes'
import { DEFAULT_SALON_NAME } from '../lib/settings'
import { openWelcomeGuide } from '../lib/welcome'
import {
  cancelInvite,
  deleteSalonAccount,
  inviteStaff,
  listOpenInvites,
  listSalonMembers,
  removeStaff,
  type SalonInviteRow,
  type SalonMemberRow,
} from '../lib/salonStaff'

function currentNotificationPermission(): NotificationPermissionResult {
  if (typeof Notification === 'undefined') return 'unavailable'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return 'denied'
}

export function Settings() {
  const { user } = useAuth()
  const { salonName, setSalonName } = useSalonName()
  const { prefs, setPrefs } = useAlertPrefs()
  const { info, error: billingError } = useSubscription()
  const [portalError, setPortalError] = useState<string | null>(null)
  const { types } = useServiceCatalog()
  const [nameDraft, setNameDraft] = useState(salonName)
  const [updatingName, setUpdatingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [permissionNote, setPermissionNote] = useState<string | null>(null)
  const [pushReady, setPushReady] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [backupNote, setBackupNote] = useState<string | null>(null)
  const [lastExportAt, setLastExportAt] = useState(readLastExportAt)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const nameCanSave = nameDraft.trim().length > 0
  const isOwner = user?.role === 'owner'
  const canManageBilling = Boolean(user) && isOwner && !paywallBypassed()
  const plan = paywallBypassed()
    ? 'Complimentary access'
    : billingError
      ? null
      : accessLabel(info)
  const trialLabel =
    info?.entitled && !info.willRenew && info.nextPaymentDate
      ? `Access continues until ${format(new Date(info.nextPaymentDate), 'd MMM yyyy')}. Your subscription will not renew.`
      : info?.period === 'trial' && info.trialEndsAt
      ? `Trial until ${format(new Date(info.trialEndsAt), 'd MMM yyyy')}.`
      : null
  const nextPaymentLabel =
    info?.willRenew && info.period === 'monthly' && info.nextPaymentDate
      ? `Next payment ${format(new Date(info.nextPaymentDate), 'd MMM yyyy')}.`
      : null
  const typeNames = types.map((type) => type.name).join(', ')

  useEffect(() => {
    if (updatingName) return
    const timer = window.setTimeout(() => setNameDraft(salonName), 0)
    return () => window.clearTimeout(timer)
  }, [salonName, updatingName])

  useEffect(() => {
    if (!updatingName) return
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [updatingName])

  useEffect(() => {
    const permission = currentNotificationPermission()
    if (permission === 'granted') return
    const current = readAlertPrefs()
    if (!current.dueToday && !current.overdue) return
    writeAlertPrefs({ dueToday: false, overdue: false })
    const timer = window.setTimeout(
      () => setPermissionNote(notificationPermissionMessage(permission)),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    void fetchPushConfig().then((config) => setPushReady(config.configured))
  }, [])

  function startNameUpdate() {
    setNameDraft(salonName)
    setUpdatingName(true)
  }

  function cancelNameUpdate() {
    setNameDraft(salonName)
    setUpdatingName(false)
  }

  function saveSalonName() {
    const next = nameDraft.trim()
    if (!next) return
    void setSalonName(next).then(() => setUpdatingName(false))
  }

  async function setAlertEnabled(key: 'dueToday' | 'overdue', on: boolean) {
    if (!on) {
      setPermissionNote(null)
      const next = { ...prefs, [key]: false }
      setPrefs(next)
      if (!next.dueToday && !next.overdue && user?.email) {
        void unsubscribeWebPush(user.email)
      }
      return
    }
    if (!user?.email) {
      setPermissionNote('Sign in to receive alerts when the app is closed.')
      return
    }
    const permission = await ensureNotificationPermission()
    if (permission !== 'granted') {
      setPermissionNote(notificationPermissionMessage(permission))
      return
    }
    let push: 'ok' | 'unavailable' | 'denied' = 'unavailable'
    try {
      push = await subscribeWebPush(user.email)
    } catch {
      push = 'unavailable'
    }
    if (push === 'denied') {
      setPermissionNote('Allow notifications in this browser.')
      return
    }
    setPrefs({ ...prefs, [key]: true })
    if (push === 'ok') {
      setPermissionNote('Alerts are on, including when the app is closed.')
    } else if (!pushReady) {
      setPermissionNote(
        'Alerts will appear while the app is open. Alerts when the app is closed are not available yet.',
      )
    } else {
      setPermissionNote(
        'Alerts are on for this device. Alerts when the app is closed will start shortly.',
      )
    }
    showLiveAlert({
      sections: [
        {
          title: key === 'dueToday' ? 'Due today' : 'Overdue',
          body:
            push === 'ok'
              ? 'You will get an alert around 8:00 when follow-ups need attention.'
              : 'You will get a local alert when follow-ups need attention.',
        },
      ],
    })
  }

  async function onSendTestAlert() {
    const result = await sendTestNotification()
    if (result === 'sent') {
      setPermissionNote('Test alert sent.')
      showLiveAlert({
        sections: [
          {
            title: 'Test alert',
            body: 'Notifications are working on this device.',
          },
        ],
      })
      return
    }
    setPermissionNote(
      result === 'denied'
        ? 'Allow notifications in this browser.'
        : 'This browser cannot show notifications.',
    )
  }

  async function onExport() {
    try {
      await exportBook()
      setLastExportAt(readLastExportAt())
      setBackupNote('Salon backup downloaded.')
    } catch {
      setBackupNote('The salon backup could not be exported. Please try again.')
    }
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return
    const replace = window.confirm(
      'Importing replaces the shared client list and notes for everyone in this salon. Continue?',
    )
    if (!replace) return
    const result = await importBook(file)
    setBackupNote(result.error ?? 'Salon backup imported successfully.')
  }

  async function onManageBilling() {
    if (!user) return
    setPortalError(null)
    try {
      const status = await fetchBillingStatus()
      if (!status.subscriptionCode) {
        setPortalError('We could not find an active subscription to manage.')
        return
      }
      const link = await openBillingPortal({
        subscriptionCode: status.subscriptionCode,
      })
      window.location.assign(link)
    } catch (error) {
      setPortalError(
        error instanceof Error ? error.message : 'The billing portal could not be opened. Please try again.',
      )
    }
  }

  async function onDeleteAccount() {
    if (!isOwner || deleteConfirmation !== salonName || deletingAccount) return
    const confirmed = window.confirm(
      `Permanently delete ${salonName}, its client data, staff access, and account history? This cannot be undone.`,
    )
    if (!confirmed) return
    setDeletingAccount(true)
    setDeleteError(null)
    const result = await deleteSalonAccount(deleteConfirmation)
    if (result.error) {
      setDeleteError(result.error)
      setDeletingAccount(false)
      return
    }
    await logoutTo(paths.landing)
  }

  return (
    <AppPage>
      <PageHeader title="Settings" />

      <div className="space-y-3">
          <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
          {updatingName ? (
            <>
              <p className="text-sm font-medium">Salon name</p>
              <input
                ref={nameInputRef}
                className="mt-2 w-full min-w-0 rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-blush md:text-sm"
                placeholder={DEFAULT_SALON_NAME}
                value={nameDraft}
                aria-label="Salon name"
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    saveSalonName()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelNameUpdate()
                  }
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
                  disabled={!nameCanSave}
                  onClick={saveSalonName}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
                  onClick={cancelNameUpdate}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Salon name</p>
                <p className="mt-0.5 font-display text-base font-semibold">
                  {salonName}
                </p>
              </div>
              {isOwner ? (
                <button
                  type="button"
                  className="shrink-0 text-sm font-medium text-blush-dark hover:underline"
                  onClick={startNameUpdate}
                >
                  Update
                </button>
              ) : null}
            </div>
          )}
        </section>

        <Link
          to={paths.serviceTypes}
          className="flex items-center justify-between gap-3 rounded-2xl bg-ivory p-4 ring-1 ring-line"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Service types</span>
            {typeNames ? (
              <span className="mt-1 block truncate text-sm text-cocoa-soft">
                {typeNames}
              </span>
            ) : null}
          </span>
          <Chevron />
        </Link>

        {isOwner ? <StaffSettings /> : null}

        <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
          <button
            type="button"
            aria-expanded={backupOpen}
            onClick={() => setBackupOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">Backup</span>
              <span className="mt-1 block truncate text-sm text-cocoa-soft">
                {lastExportLabel(lastExportAt)}
              </span>
            </span>
            <Chevron className={backupOpen ? 'rotate-90' : undefined} />
          </button>
          {backupOpen ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Export salon backup</span>
                <button
                  type="button"
                  className={fieldActionClassName}
                  onClick={() => void onExport()}
                >
                  Export
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Import salon backup</span>
                <button
                  type="button"
                  className={fieldActionClassName}
                  onClick={() => importInputRef.current?.click()}
                >
                  Import
                </button>
              </div>
              {backupNote ? (
                <p className="text-sm text-cocoa-soft">{backupNote}</p>
              ) : null}
            </div>
          ) : null}
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void onImportFile(file)
            }}
          />
        </section>

        <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Subscription</h2>
            <p className="font-display shrink-0 text-sm font-semibold">
              NewRecall
            </p>
          </div>
          {plan ? (
            <p className="mt-1 text-sm text-cocoa-soft">{plan}</p>
          ) : null}
          {trialLabel ? (
            <p className="mt-1 text-sm text-cocoa-soft">{trialLabel}</p>
          ) : null}
          {nextPaymentLabel ? (
            <p className="mt-1 text-sm text-cocoa-soft">{nextPaymentLabel}</p>
          ) : null}
          {user?.email ? (
            <p className="mt-1 truncate text-sm text-cocoa-soft">
              {isOwner
                ? user.email
                : `Billed to the owner${user.billingEmail ? ` (${user.billingEmail})` : ''}`}
            </p>
          ) : null}
          {!isOwner ? (
            <p className="mt-1 text-sm text-cocoa-soft">
              Only the owner can manage the subscription.
            </p>
          ) : null}
          {billingError ? (
            <p className="mt-2 text-sm text-cocoa-soft">{billingError}</p>
          ) : null}
          {portalError ? (
            <p className="mt-2 text-sm text-cocoa-soft">{portalError}</p>
          ) : null}
          {canManageBilling ? (
            <button
              type="button"
              className={`${fieldActionClassName} mt-3`}
              onClick={() => void onManageBilling()}
            >
              Manage subscription
            </button>
          ) : null}
        </section>

        <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
          <h2 className="text-sm font-medium">Notification alerts</h2>
          <p className="mt-1 text-sm text-cocoa-soft">
            {pushReady
              ? `You will receive an alert around 8:00, even if the app is closed. On iPhone, add ${salonName} to your Home Screen so alerts arrive reliably.`
              : 'Alerts appear while the app is open. Alerts when the app is closed are not available yet.'}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Due today</span>
              <Switch
                checked={prefs.dueToday}
                label="Due today"
                onCheckedChange={(on) => void setAlertEnabled('dueToday', on)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Overdue</span>
              <Switch
                checked={prefs.overdue}
                label="Overdue"
                onCheckedChange={(on) => void setAlertEnabled('overdue', on)}
              />
            </div>
          </div>
          {(prefs.dueToday || prefs.overdue) &&
          currentNotificationPermission() === 'granted' ? (
            <button
              type="button"
              className={`${fieldActionClassName} mt-3`}
              onClick={() => void onSendTestAlert()}
            >
              Send a test alert
            </button>
          ) : null}
          {permissionNote ? (
            <p className="mt-2 text-sm text-cocoa-soft">{permissionNote}</p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
          <h2 className="text-sm font-medium">Getting started</h2>
          <p className="mt-1 text-sm text-cocoa-soft">
            Reopen the welcome guide for a quick overview of your NewRecall workspace.
          </p>
          <button
            type="button"
            className={`${fieldActionClassName} mt-3`}
            onClick={openWelcomeGuide}
          >
            Open welcome guide
          </button>
        </section>

        {isOwner ? (
          <section className="rounded-2xl bg-ivory p-4 ring-1 ring-overdue/30">
            <h2 className="text-sm font-medium text-overdue">Delete salon account</h2>
            <p className="mt-1 text-sm text-cocoa-soft">
              This permanently removes the salon workspace, clients, notes, services, staff access,
              invitations, and NewRecall sign-in accounts. Any active Paystack renewal is cancelled first.
              Download a backup before continuing if you need to keep the salon records.
            </p>
            <label className="mt-3 block text-sm">
              Enter <strong>{salonName}</strong> to confirm
              <input
                className="mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-overdue md:text-sm"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
              />
            </label>
            {deleteError ? <p className="mt-2 text-sm text-overdue">{deleteError}</p> : null}
            <button
              type="button"
              className="mt-3 rounded-lg bg-overdue px-3 py-2 text-sm font-semibold text-ivory disabled:opacity-40"
              disabled={deleteConfirmation !== salonName || deletingAccount}
              onClick={() => void onDeleteAccount()}
            >
              {deletingAccount ? 'Deleting salon account…' : 'Permanently delete salon account'}
            </button>
          </section>
        ) : null}

        <button
          type="button"
          className="pt-1 text-sm font-medium text-blush-dark"
          onClick={() => logoutTo(paths.landing)}
        >
          Log out
        </button>
      </div>
    </AppPage>
  )
}

function StaffSettings() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState<SalonMemberRow[]>([])
  const [invites, setInvites] = useState<SalonInviteRow[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [nextMembers, nextInvites] = await Promise.all([
      listSalonMembers(),
      listOpenInvites(),
    ])
    setMembers(nextMembers)
    setInvites(nextInvites)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch(() => setNote('Staff details could not be loaded. Please refresh the page.'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function onInvite() {
    setBusy(true)
    setNote(null)
    const result = await inviteStaff(email)
    setBusy(false)
    if (result.error) {
      setNote(result.error)
      return
    }
    setEmail('')
    setNote('Invite sent.')
    await refresh()
  }

  return (
    <section id="staff" className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
      <h2 className="text-sm font-medium">Staff</h2>
      <p className="mt-1 text-sm text-cocoa-soft">
        Staff share this salon’s clients, services, and follow-ups. They do not need a separate subscription.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-blush"
          type="email"
          placeholder="staff@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="button"
          className={fieldActionClassName}
          disabled={busy || !email.includes('@')}
          onClick={() => void onInvite()}
        >
          Invite
        </button>
      </div>
      {note ? <p className="mt-2 text-sm text-cocoa-soft">{note}</p> : null}
      <ul className="mt-3 space-y-2">
        {members.map((member) => (
          <li key={member.userId} className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm">{member.name}</span>
              <span className="block truncate text-sm text-cocoa-soft">
                {member.email} · {member.role}
              </span>
            </span>
            {member.role === 'staff' && member.userId !== user?.id ? (
              <button
                type="button"
                className="shrink-0 text-sm text-overdue hover:underline"
                onClick={() => {
                  void removeStaff(member.userId).then((result) => {
                    setNote(result.error ?? 'Staff removed.')
                    void refresh()
                  })
                }}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-sm text-cocoa-soft">
              Invite pending · {invite.email}
            </span>
            <button
              type="button"
              className="shrink-0 text-sm text-overdue hover:underline"
              onClick={() => {
                void cancelInvite(invite.id).then((result) => {
                  setNote(result.error ?? 'Invite cancelled.')
                  void refresh()
                })
              }}
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 text-cocoa-soft transition-transform ${className ?? ''}`}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M6 4.5 10.5 8 6 11.5"
      />
    </svg>
  )
}
