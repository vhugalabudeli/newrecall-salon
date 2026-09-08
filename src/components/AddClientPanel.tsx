import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import {
  addClient,
  deleteClient,
  updateClientDetails,
} from '../lib/db'
import {
  DEFAULT_LIFESPAN_WEEKS,
  DEFAULT_SERVICE_TYPE,
  clientServiceType,
  recallLeadLabels,
  recallLeads,
  lifespanWeekOptions,
} from '../lib/labels'
import {
  callingCodeOptions,
  clientCallingCode,
  deviceCallingCode,
} from '../lib/callingCode'
import { clearBookDraft, peekBookDraft, saveBookDraft } from '../lib/bookDraft'
import { formatLifespan, lapseDate, recallDate, todayIso } from '../lib/schedule'
import {
  ensureTypesForClients,
  rememberCatalogService,
  serviceTypeLabel,
} from '../lib/serviceCatalog'
import { paths } from '../lib/routes'
import type { Client, ClientDraft, RecallLead } from '../types'
import { useVisibleViewportHeight } from '../hooks/useVisibleViewportHeight'
import { SelectTrigger } from './SelectSheet'

const emptyDraft = (): ClientDraft => ({
  clientName: '',
  clientPhone: '',
  clientPhoneCode: deviceCallingCode(),
  guestName: '',
  guestIsClient: true,
  relationship: 'self',
  serviceType: DEFAULT_SERVICE_TYPE,
  service: '',
  lastVisitDate: todayIso(),
  lifespanWeeks: DEFAULT_LIFESPAN_WEEKS,
  recallLead: 'week_before',
})

function draftFromClient(client: Client): ClientDraft {
  return {
    clientName: client.clientName,
    clientPhone: client.clientPhone,
    clientPhoneCode: clientCallingCode(client),
    guestName: client.guestName,
    guestIsClient:
      client.relationship === 'self' &&
      client.guestName === client.clientName,
    relationship: client.relationship,
    serviceType: clientServiceType(client),
    service: client.service,
    lastVisitDate: client.lastVisitDate,
    lifespanWeeks: client.lifespanWeeks,
    recallLead: client.recallLead,
  }
}

type AddClientPanelProps = {
  client?: Client | null
  onClose: () => void
}

export function AddClientPanel({ client, onClose }: AddClientPanelProps) {
  const viewportHeight = useVisibleViewportHeight()
  const { clients } = useClients()
  const catalog = useServiceCatalog()
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState<ClientDraft>(() => {
    if (client) {
      const pending = peekBookDraft()
      if (pending?.clientId === client.id) return pending.draft
      return draftFromClient(client)
    }
    const pending = peekBookDraft()
    if (pending?.returnTo === location.pathname && !pending.clientId) {
      return pending.draft
    }
    return emptyDraft()
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const phoneCodeOptions = useMemo(
    () => callingCodeOptions(deviceCallingCode(), draft.clientPhoneCode),
    [draft.clientPhoneCode],
  )
  const scrollerRef = useRef<HTMLDivElement>(null)
  const forFieldRef = useRef<HTMLDivElement>(null)
  const revealFor = useRef(false)

  useEffect(() => {
    ensureTypesForClients(clients)
  }, [clients])

  useEffect(() => {
    if (!revealFor.current || draft.guestIsClient) return
    revealFor.current = false
    const scroller = scrollerRef.current
    const field = forFieldRef.current
    if (!scroller || !field) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        const scrollerBox = scroller.getBoundingClientRect()
        const fieldBox = field.getBoundingClientRect()
        const overflow = fieldBox.bottom - scrollerBox.bottom + 16
        if (overflow > 1) {
          scroller.scrollBy({ top: overflow, behavior: 'smooth' })
        }
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [draft.guestIsClient])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const preview = useMemo(() => {
    const probe: Client = {
      id: 'preview',
      clientName: draft.clientName || 'Client',
      clientPhone: draft.clientPhone,
      clientPhoneCode: draft.clientPhoneCode,
      guestName: draft.guestIsClient ? draft.clientName : draft.guestName,
      relationship: draft.guestIsClient ? 'self' : draft.relationship,
      serviceType: draft.serviceType,
      service: draft.service,
      lastVisitDate: draft.lastVisitDate || todayIso(),
      lifespanWeeks: draft.lifespanWeeks,
      recallLead: draft.recallLead,
      bookingStatus: 'not_yet_booked',
      contactStatus: 'not_yet_contacted',
      notes: [],
      createdAt: '',
      updatedAt: '',
    }
    return {
      lapse: lapseDate(probe),
      recall: recallDate(probe),
    }
  }, [draft])

  function patch(update: Partial<ClientDraft>) {
    setDraft((current) => ({ ...current, ...update }))
    setError('')
  }

  function closePanel() {
    clearBookDraft()
    onClose()
  }

  function leaveToAdd(path: string) {
    saveBookDraft({
      returnTo: location.pathname,
      clientId: client?.id,
      draft,
    })
    navigate(path)
  }

  function onTypeChange(serviceType: string) {
    const services =
      catalog.types.find((type) => type.id === serviceType)?.services ?? []
    const keep = services.some((service) => service.name === draft.service)
    const match = services.find((service) => service.name === draft.service)
    patch({
      serviceType,
      service: keep ? draft.service : '',
      ...(match ? { lifespanWeeks: match.lifespanWeeks } : {}),
    })
  }

  function onServiceChange(value: string) {
    const match = (
      catalog.types.find((type) => type.id === draft.serviceType)?.services ?? []
    ).find((service) => service.name === value)
    patch({
      service: value,
      ...(match ? { lifespanWeeks: match.lifespanWeeks } : {}),
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.clientName.trim()) {
      setError('Enter the client name.')
      return
    }
    if (!draft.clientPhone.trim()) {
      setError('Enter the client phone.')
      return
    }
    if (!draft.serviceType.trim()) {
      setError('Pick a service type.')
      return
    }
    if (!draft.service.trim()) {
      setError('Pick a service.')
      return
    }
    if (!draft.lastVisitDate) {
      setError('Enter the last visit date.')
      return
    }
    if (!draft.guestIsClient && !draft.guestName.trim()) {
      setError('Enter who the visit is for, or mark the booking as for the client.')
      return
    }

    setSaving(true)
    try {
      if (client) {
        await updateClientDetails(client.id, draft)
      } else {
        await addClient(draft)
      }
      rememberCatalogService(draft.serviceType, draft.service, draft.lifespanWeeks)
      closePanel()
    } catch {
      setError('Could not save this client. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!client) return
    const confirmed = window.confirm(
      `Remove ${client.clientName} from the client list?`,
    )
    if (!confirmed) return
    await deleteClient(client.id)
    closePanel()
  }

  const typeOptions = catalog.types.map((type) => ({
    value: type.id,
    label: type.name,
  }))
  if (
    draft.serviceType &&
    !typeOptions.some((option) => option.value === draft.serviceType)
  ) {
    typeOptions.push({
      value: draft.serviceType,
      label: serviceTypeLabel(draft.serviceType),
    })
  }

  const typeServices =
    catalog.types.find((type) => type.id === draft.serviceType)?.services ?? []
  const serviceOptions = typeServices.map((service) => ({
    value: service.name,
    label: service.name,
  }))
  if (
    draft.service &&
    !serviceOptions.some((option) => option.value === draft.service)
  ) {
    serviceOptions.unshift({
      value: draft.service,
      label: draft.service,
    })
  }

  return (
    <div
      className="fixed top-0 right-0 left-0 z-40 flex justify-end overflow-x-clip"
      style={{ height: viewportHeight }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-cocoa/30"
        aria-label="Close panel"
        onClick={closePanel}
      />
      <form
        onSubmit={onSubmit}
        className="relative flex h-full min-w-0 w-full flex-col bg-ivory shadow-2xl md:w-[440px]"
      >
        <div className="border-b border-line px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:py-5">
          <p className="text-xs font-medium tracking-wide text-blush-dark uppercase">
            {client ? 'Edit client' : 'New client'}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold">
            {client ? client.clientName : 'Add to the book'}
          </h2>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 min-w-0 space-y-4 overflow-y-auto overflow-x-clip px-5 py-5 md:px-6"
        >
          <Field label="Client name">
            <input
              className={inputClass}
              value={draft.clientName}
              onChange={(event) => patch({ clientName: event.target.value })}
            />
          </Field>

          <div className="block min-w-0 space-y-1.5">
            <span className="text-sm font-medium">Client phone</span>
            <div className="flex min-w-0 gap-2">
              <div className="w-[6.75rem] shrink-0">
                <SelectTrigger
                  title="Calling code"
                  className={callingCodeClass}
                  value={draft.clientPhoneCode}
                  options={phoneCodeOptions}
                  onChange={(clientPhoneCode) => patch({ clientPhoneCode })}
                />
              </div>
              <input
                className={`${inputClass} min-w-0 flex-1`}
                value={draft.clientPhone}
                onChange={(event) =>
                  patch({ clientPhone: event.target.value })
                }
                placeholder="Phone number"
                inputMode="tel"
                autoComplete="tel-national"
                aria-label="Phone number"
              />
            </div>
          </div>

          <Field label="Service type">
            <SelectTrigger
              title="Service type"
              className={inputClass}
              value={draft.serviceType}
              options={typeOptions}
              placeholder="Select a type"
              emptyText="No service types yet."
              extraAction={{
                label: 'Add a service type',
                onClick: () =>
                  leaveToAdd(`${paths.serviceTypes}?from=book`),
              }}
              onChange={onTypeChange}
            />
            <button
              type="button"
              className="pt-1 text-left text-sm font-medium text-blush-dark"
              onClick={() => leaveToAdd(`${paths.serviceTypes}?from=book`)}
            >
              Add a service type
            </button>
          </Field>

          <Field label="Service">
            <SelectTrigger
              title="Service"
              className={inputClass}
              value={draft.service}
              options={serviceOptions}
              placeholder="Select a service"
              emptyText="No services in this type yet."
              extraAction={{
                label: 'Add a service',
                onClick: () =>
                  leaveToAdd(
                    `${paths.serviceType(draft.serviceType || DEFAULT_SERVICE_TYPE)}?from=book`,
                  ),
              }}
              onChange={onServiceChange}
            />
            <button
              type="button"
              className="pt-1 text-left text-sm font-medium text-blush-dark"
              onClick={() =>
                leaveToAdd(
                  `${paths.serviceType(draft.serviceType || DEFAULT_SERVICE_TYPE)}?from=book`,
                )
              }
            >
              Add a service
            </button>
          </Field>

          <Field label="Last visit">
            <input
              className={inputClass}
              type="date"
              value={draft.lastVisitDate}
              onChange={(event) => patch({ lastVisitDate: event.target.value })}
            />
          </Field>

          <Field label="Lifespan">
            <SelectTrigger
              title="Lifespan"
              className={inputClass}
              value={draft.lifespanWeeks}
              options={lifespanWeekOptions.map((weeks) => ({
                value: weeks,
                label: formatLifespan(weeks),
              }))}
              onChange={(weeks) => patch({ lifespanWeeks: weeks })}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Recall before it lapses
            </legend>
            {recallLeads.map((lead) => (
              <label
                key={lead}
                className="flex items-center gap-2 text-sm text-cocoa"
              >
                <input
                  type="radio"
                  name="recallLead"
                  className="accent-blush"
                  checked={draft.recallLead === lead}
                  onChange={() => patch({ recallLead: lead as RecallLead })}
                />
                {recallLeadLabels[lead]}
              </label>
            ))}
          </fieldset>

          <p className="rounded-xl bg-cream px-3 py-2.5 text-sm text-cocoa-soft">
            Lapses {formatDate(preview.lapse)}. Recall{' '}
            {formatDate(preview.recall)}.
          </p>

          <label className="flex items-start gap-2 rounded-xl bg-cream px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 accent-blush"
              checked={draft.guestIsClient}
              onChange={(event) => {
                const guestIsClient = event.target.checked
                if (!guestIsClient) revealFor.current = true
                patch({
                  guestIsClient,
                  relationship: guestIsClient
                    ? 'self'
                    : draft.relationship === 'self'
                      ? 'other'
                      : draft.relationship,
                })
              }}
            />
            <span>
              This booking is for the client
              <span className="mt-0.5 block text-cocoa-soft">
                Clear this if the visit is for someone else.
              </span>
            </span>
          </label>

          {draft.guestIsClient ? null : (
            <div ref={forFieldRef}>
              <Field label="For">
                <input
                  className={inputClass}
                  value={draft.guestName}
                  onChange={(event) =>
                    patch({ guestName: event.target.value })
                  }
                  placeholder="Guest name"
                />
              </Field>
            </div>
          )}

          {error ? <p className="text-sm text-overdue">{error}</p> : null}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
          {client ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sm text-overdue hover:underline"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={closePanel}
            className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blush px-4 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-60"
          >
            {client ? 'Save' : 'Add client'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="block min-w-0 space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const inputClass =
  'box-border w-full min-w-0 max-w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base text-cocoa outline-none focus:border-blush disabled:bg-cream disabled:text-cocoa-soft md:py-2 md:text-sm'

const callingCodeClass =
  'box-border w-full min-w-0 max-w-full rounded-lg border border-line bg-ivory px-2 py-2.5 text-base text-cocoa outline-none focus:border-blush md:py-2 md:text-sm'
