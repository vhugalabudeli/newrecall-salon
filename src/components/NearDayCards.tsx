import type { Client } from '../types'
import { guestSubtitle } from '../lib/labels'
import {
  dueLaterThisWeek,
  dueToday,
  formatDayLabel,
  formatWeekRange,
  overdueClients,
  weekBounds,
} from '../lib/schedule'
import { PeriodCard } from './PeriodCard'

function rowLabel(client: Client) {
  const guest = guestSubtitle(client)
  return guest ? `${client.clientName} · ${guest}` : client.clientName
}

type NearDayCardsProps = {
  clients: Client[]
  today?: Date
  onSelectClient: (client: Client) => void
}

export function NearDayCards({
  clients,
  today = new Date(),
  onSelectClient,
}: NearDayCardsProps) {
  const overdue = overdueClients(clients, today)
  const todayList = dueToday(clients, today)
  const weekList = dueLaterThisWeek(clients, today)
  const { start, end } = weekBounds(0, today)
  const hasOverdue = overdue.length > 0
  const hasToday = todayList.length > 0

  return (
    <div className="space-y-3">
      <PeriodCard
        eyebrow="Overdue"
        eyebrowClassName={hasOverdue ? 'text-overdue' : undefined}
        total={overdue.length}
        rows={overdue.map((client) => ({
          key: client.id,
          onSelect: () => onSelectClient(client),
          label: rowLabel(client),
        }))}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PeriodCard
          eyebrow="Due today"
          eyebrowClassName={hasToday ? 'text-overdue' : undefined}
          title={formatDayLabel(today)}
          titleClassName={hasToday ? 'text-overdue' : undefined}
          total={todayList.length}
          rows={todayList.map((client) => ({
            key: client.id,
            onSelect: () => onSelectClient(client),
            label: rowLabel(client),
          }))}
        />
        <PeriodCard
          eyebrow="Due this week"
          title={formatWeekRange(start, end)}
          total={weekList.length}
          rows={weekList.map((client) => ({
            key: client.id,
            onSelect: () => onSelectClient(client),
            label: rowLabel(client),
          }))}
        />
      </div>
    </div>
  )
}
