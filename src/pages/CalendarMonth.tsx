import { addDays, startOfDay } from 'date-fns'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AddClientPanel } from '../components/AddClientPanel'
import { AppPage } from '../components/AppPage'
import { PageHeader } from '../components/PageHeader'
import { RecallCard } from '../components/RecallCard'
import { useClients } from '../hooks/useClients'
import { guestSubtitle } from '../lib/labels'
import { paths } from '../lib/routes'
import { clientsOnRecallDate, formatDayLabel, formatRecall, recallDate } from '../lib/schedule'
import type { Client } from '../types'

const MIN_DAY_OFFSET = -90
const MAX_DAY_OFFSET = 120

export function CalendarMonth() {
  const { offset } = useParams()
  const navigate = useNavigate()
  const dayOffset = Number(offset)
  const { clients } = useClients()
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (
    !Number.isInteger(dayOffset) ||
    dayOffset < MIN_DAY_OFFSET ||
    dayOffset > MAX_DAY_OFFSET
  ) {
    return <Navigate to={paths.calendar} replace />
  }

  const today = startOfDay(new Date())
  const date = addDays(today, dayOffset)
  const dayLabel = formatDayLabel(date)
  const dayClients = clientsOnRecallDate(clients, date)
  const viewing = clients.find((client) => client.id === viewingId) ?? null
  const editing = clients.find((client) => client.id === editingId) ?? null

  if (viewing) {
    return (
      <AppPage>
        <PageHeader
          title={viewing.clientName}
          subtitle={formatRecall(recallDate(viewing))}
          titleClassName="text-blush-dark"
          onBack={() => setViewingId(null)}
          backLabel={`Back to ${dayLabel}`}
        />

        <RecallCard
          client={viewing}
          onEdit={(client) => setEditingId(client.id)}
        />

        {editing ? (
          <AddClientPanel
            client={editing}
            onClose={() => setEditingId(null)}
          />
        ) : null}
      </AppPage>
    )
  }

  return (
    <AppPage>
      <PageHeader
        title={dayLabel}
        subtitle={`${dayClients.length} ${dayClients.length === 1 ? 'follow-up' : 'follow-ups'}`}
        onBack={() => navigate(paths.calendar)}
        backLabel="Back to calendar"
      />

      {dayClients.length === 0 ? (
        <p className="rounded-2xl bg-ivory px-4 py-8 text-sm text-cocoa-soft ring-1 ring-line">
          No client follow-ups scheduled for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {dayClients.map((client) => (
            <DayClientName
              key={client.id}
              client={client}
              onSelect={() => setViewingId(client.id)}
            />
          ))}
        </div>
      )}
    </AppPage>
  )
}

function DayClientName({
  client,
  onSelect,
}: {
  client: Client
  onSelect: () => void
}) {
  const guest = guestSubtitle(client)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-2xl bg-ivory px-4 py-3 text-left ring-1 ring-line transition active:bg-rose-mist [@media(hover:hover)]:hover:bg-rose-mist"
    >
      <p className="truncate font-semibold">{client.clientName}</p>
      {guest ? (
        <p className="mt-0.5 truncate text-sm text-cocoa-soft">{guest}</p>
      ) : null}
    </button>
  )
}
