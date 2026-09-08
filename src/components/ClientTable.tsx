import { useMemo, useState, type ReactNode } from 'react'
import type { BookingStatus, Client, ContactStatus } from '../types'
import {
  bookingStatusLabels,
  clientServiceType,
  contactStatusLabels,
  guestSubtitle,
} from '../lib/labels'
import { serviceTypeLabel } from '../lib/serviceCatalog'
import {
  clientCallingCode,
  formatClientPhone,
} from '../lib/callingCode'
import {
  daysUntil,
  formatRecall,
  isOnDueList,
  overdueClients,
  recallDate,
  timeFrameLabel,
} from '../lib/schedule'
import { AddClientPanel } from './AddClientPanel'
import { PhoneLink } from './PhoneLink'

type ClientSegment = 'all' | 'open' | 'cleared'

const SEGMENTS: { id: ClientSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Follow-up' },
  { id: 'cleared', label: 'Cleared' },
]

type ClientTableProps = {
  clients: Client[]
  ready: boolean
  onAdd: () => void
  onUpdate: (client: Client) => void
}

export function ClientTable({ clients, ready, onAdd, onUpdate }: ClientTableProps) {
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [editing, setEditing] = useState<Client | null>(null)

  const editingLive =
    clients.find((client) => client.id === editing?.id) ?? editing

  const openCount = useMemo(
    () => clients.filter(isOnDueList).length,
    [clients],
  )
  const overdueFollowUpCount = useMemo(
    () => overdueClients(clients).length,
    [clients],
  )
  const clearedCount = clients.length - openCount

  const segmented = useMemo(() => {
    if (segment === 'open') return clients.filter(isOnDueList)
    if (segment === 'cleared') return clients.filter((client) => !isOnDueList(client))
    return clients
  }, [clients, segment])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return segmented
    return segmented.filter((client) => {
      const haystack = [
        client.clientName,
        client.clientPhone,
        formatClientPhone(clientCallingCode(client), client.clientPhone),
        client.guestName,
        client.service,
        serviceTypeLabel(clientServiceType(client)),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [segmented, query])

  const emptyMessage = query.trim()
    ? 'No clients match that search.'
    : segment === 'open'
      ? 'No clients need follow-up.'
      : segment === 'cleared'
        ? 'No cleared clients.'
        : 'No clients match that search.'

  const segmentCount = (id: ClientSegment) => {
    if (id === 'open') return openCount
    if (id === 'cleared') return clearedCount
    return clients.length
  }

  if (!ready) {
    return (
      <section className="rounded-2xl bg-ivory p-8 text-sm text-cocoa-soft ring-1 ring-line">
        Loading clients…
      </section>
    )
  }

  if (clients.length === 0) {
    return (
      <section className="rounded-2xl bg-ivory p-10 text-center ring-1 ring-line">
        <p className="font-display text-2xl font-semibold">No clients yet</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 rounded-lg bg-blush px-4 py-2.5 text-sm font-semibold text-ivory hover:bg-blush-dark"
        >
          Add client
        </button>
      </section>
    )
  }

  return (
    <section>
      <div
        role="tablist"
        aria-label="Client status"
        className="mb-3 flex flex-wrap items-center gap-2"
      >
        {SEGMENTS.map((item) => {
          const selected = segment === item.id
          const count = segmentCount(item.id)
          const showOverdueHint =
            item.id === 'open' && overdueFollowUpCount > 0
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={
                showOverdueHint
                  ? `${item.label}, ${count}, ${overdueFollowUpCount} overdue`
                  : `${item.label}, ${count}`
              }
              onClick={() => setSegment(item.id)}
              className={
                selected
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-rose-mist px-2.5 py-1 text-sm font-medium text-blush-dark'
                  : 'inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-sm text-cocoa-soft ring-1 ring-line'
              }
            >
              <span>{item.label}</span>
              <span className="tabular-nums">{count}</span>
              {showOverdueHint ? (
                <span
                  className={
                    selected
                      ? 'tabular-nums text-overdue'
                      : 'tabular-nums text-overdue/80'
                  }
                >
                  · {overdueFollowUpCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {query ? (
          <p className="text-sm text-cocoa-soft">{filtered.length} shown</p>
        ) : (
          <span className="hidden sm:block" />
        )}
        <input
          className="w-full min-w-0 rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-blush sm:ml-auto sm:w-72 md:text-sm"
          placeholder="Search name, phone, who it's for"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
        {filtered.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onSelect={() => onUpdate(client)}
          />
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-ivory px-3 py-8 text-center text-sm text-cocoa-soft ring-1 ring-line md:col-span-2">
            {emptyMessage}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl bg-ivory ring-1 ring-line lg:block">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="border-b border-line bg-ivory text-xs tracking-wide text-cocoa-soft uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Service</th>
              <th className="px-3 py-3 font-medium">Recall</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Response</th>
              <th className="px-3 py-3 font-medium text-right">
                <span className="sr-only">Update</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                onEdit={() => setEditing(client)}
                onUpdate={() => onUpdate(client)}
              />
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-cocoa-soft"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingLive ? (
        <AddClientPanel
          client={editingLive}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  )
}

const labelBaseClassName =
  'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium'

function ClientLabel({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <span className={`${labelBaseClassName} ${className}`}>{children}</span>
  )
}

function ServiceLabel({ client }: { client: Client }) {
  return (
    <ClientLabel className="bg-cream text-cocoa-soft ring-1 ring-line">
      {serviceTypeLabel(clientServiceType(client))} · {client.service}
    </ClientLabel>
  )
}

function ContactLabel({ status }: { status: ContactStatus }) {
  return (
    <ClientLabel className="bg-cream text-blush-dark ring-1 ring-line">
      {contactStatusLabels[status]}
    </ClientLabel>
  )
}

function BookingLabel({ status }: { status: BookingStatus }) {
  return (
    <ClientLabel className="bg-cream text-sage ring-1 ring-line">
      {bookingStatusLabels[status]}
    </ClientLabel>
  )
}

function ClientRow({
  client,
  onEdit,
  onUpdate,
}: {
  client: Client
  onEdit: () => void
  onUpdate: () => void
}) {
  const today = new Date()
  const due = recallDate(client)
  const remaining = daysUntil(due, today)
  const overdue = remaining < 0
  const guest = guestSubtitle(client)

  return (
    <tr className="border-t border-line align-top">
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={onEdit}
          className="text-left font-medium hover:text-blush-dark hover:underline"
        >
          <span className="block">{client.clientName}</span>
          {guest ? (
            <span className="mt-0.5 block text-xs font-normal text-cocoa-soft">
              {guest}
            </span>
          ) : null}
        </button>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <PhoneLink
          phone={client.clientPhone}
          callingCode={client.clientPhoneCode}
        />
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <ServiceLabel client={client} />
      </td>
      <td className="px-3 py-3">
        <p className="font-medium">{formatRecall(due)}</p>
        {overdue ? (
          <ClientLabel className="mt-1 bg-rose-mist text-overdue">
            {timeFrameLabel(due, today)}
          </ClientLabel>
        ) : (
          <p className="text-cocoa-soft">{timeFrameLabel(due, today)}</p>
        )}
      </td>
      <td className="px-3 py-3">
        <ContactLabel status={client.contactStatus} />
      </td>
      <td className="px-3 py-3">
        <BookingLabel status={client.bookingStatus} />
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={onUpdate}
          className="text-xs font-medium text-blush-dark hover:underline"
        >
          Update
        </button>
      </td>
    </tr>
  )
}

function ClientCard({
  client,
  onSelect,
}: {
  client: Client
  onSelect: () => void
}) {
  const today = new Date()
  const due = recallDate(client)
  const overdue = daysUntil(due, today) < 0
  const guest = guestSubtitle(client)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-ivory p-4 text-left ring-1 ring-line transition active:bg-rose-mist [@media(hover:hover)]:hover:bg-rose-mist"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{client.clientName}</p>
        {guest ? (
          <p className="mt-0.5 truncate text-sm text-cocoa-soft">{guest}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ContactLabel status={client.contactStatus} />
          <BookingLabel status={client.bookingStatus} />
          <ClientLabel
            className={
              overdue
                ? 'bg-rose-mist text-overdue'
                : 'bg-cream text-cocoa-soft ring-1 ring-line'
            }
          >
            {formatRecall(due)}
          </ClientLabel>
        </div>
      </div>
    </button>
  )
}