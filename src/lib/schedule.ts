import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  intervalToDuration,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'
import type { Client, RecallLead } from '../types'

export const WEEK_STARTS_ON = 1 as const

export function parseVisitDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return startOfDay(new Date(year, month - 1, day))
}

export function todayIso(today = new Date()): string {
  return format(startOfDay(today), 'yyyy-MM-dd')
}

export function leadDays(lead: RecallLead): number {
  if (lead === 'week_before') return 7
  if (lead === 'day_before') return 1
  return 0
}

export function lapseDate(client: Client): Date {
  return addWeeks(parseVisitDate(client.lastVisitDate), client.lifespanWeeks)
}

export function recallDate(client: Client): Date {
  return subDays(lapseDate(client), leadDays(client.recallLead))
}

export function isOnDueList(client: Client): boolean {
  const stillOpen =
    client.contactStatus === 'not_yet_contacted' ||
    client.contactStatus === 'contacted_unreachable'
  return stillOpen && client.bookingStatus === 'not_yet_booked'
}

export function daysUntil(date: Date, today = new Date()): number {
  return differenceInCalendarDays(startOfDay(date), startOfDay(today))
}

function unitLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

/** Relative span using years, months, weeks, then days — largest applicable units. */
export function timeFrameLabel(target: Date, today = new Date()): string {
  const startToday = startOfDay(today)
  const startTarget = startOfDay(target)
  const days = differenceInCalendarDays(startTarget, startToday)
  if (days === 0) return 'today'

  const later = days > 0
  const duration = intervalToDuration({
    start: later ? startToday : startTarget,
    end: later ? startTarget : startToday,
  })
  let years = duration.years ?? 0
  let months = duration.months ?? 0
  let extraDays = duration.days ?? 0
  let weeks = Math.floor(extraDays / 7)
  let restDays = extraDays % 7
  if ((years > 0 || months > 0) && weeks >= 4) {
    months += 1
    extraDays -= 28
    weeks = Math.floor(extraDays / 7)
    restDays = extraDays % 7
  }
  if (months >= 12) {
    years += Math.floor(months / 12)
    months = months % 12
  }

  const parts: string[] = []
  if (years) parts.push(unitLabel(years, 'year', 'years'))
  if (months) parts.push(unitLabel(months, 'month', 'months'))
  if (weeks) parts.push(unitLabel(weeks, 'week', 'weeks'))
  if (restDays) parts.push(unitLabel(restDays, 'day', 'days'))
  if (parts.length === 0) {
    parts.push(unitLabel(Math.abs(days), 'day', 'days'))
  }

  const body = parts.slice(0, 2).join(' and ')
  return later ? `in ${body}` : `${body} overdue`
}

export function formatLastVisit(iso: string): string {
  return format(parseVisitDate(iso), 'd MMM yyyy')
}

export function formatRecall(date: Date): string {
  return format(date, 'd MMM yyyy')
}

export function formatLifespan(weeks: number): string {
  return weeks === 1 ? '1 week' : `${weeks} weeks`
}

export function formatWeekRange(start: Date, end: Date): string {
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

function dueClients(clients: Client[]): Client[] {
  return clients.filter(isOnDueList)
}

export function dueToday(clients: Client[], today = new Date()): Client[] {
  return dueClients(clients).filter(
    (client) => daysUntil(recallDate(client), today) === 0,
  )
}

export function dueThisWeek(clients: Client[], today = new Date()): Client[] {
  const start = startOfDay(today)
  const end = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON })
  return dueClients(clients).filter((client) => {
    const date = recallDate(client)
    return date >= start && date <= end
  })
}

export function dueLaterThisWeek(
  clients: Client[],
  today = new Date(),
): Client[] {
  return sortByRecall(
    dueThisWeek(clients, today).filter(
      (client) => daysUntil(recallDate(client), today) > 0,
    ),
  )
}

export function dueThisMonth(clients: Client[], today = new Date()): Client[] {
  const start = startOfDay(today)
  const end = endOfMonth(today)
  return dueClients(clients).filter((client) => {
    const date = recallDate(client)
    return date >= start && date <= end
  })
}

export function overdueClients(
  clients: Client[],
  today = new Date(),
): Client[] {
  return dueClients(clients)
    .filter((client) => daysUntil(recallDate(client), today) < 0)
    .sort(
      (a, b) =>
        daysUntil(recallDate(a), today) - daysUntil(recallDate(b), today),
    )
}

export type DayGroup = {
  id: string
  title: string
  offset: number
  clients: Client[]
}

function dayTitle(offset: number): string {
  if (offset === 0) return 'Due today'
  if (offset === 1) return 'Due tomorrow'
  if (offset === 2) return 'Due in 2 days'
  return `Due in ${offset} days`
}

export function scheduleDayGroups(
  clients: Client[],
  today = new Date(),
): DayGroup[] {
  const groups: DayGroup[] = []
  const overdue = overdueClients(clients, today)
  if (overdue.length > 0) {
    groups.push({
      id: 'overdue',
      title: 'Overdue',
      offset: -1,
      clients: overdue,
    })
  }

  const active = dueClients(clients)
  for (let offset = 0; offset <= 30; offset += 1) {
    const list = active.filter(
      (client) => daysUntil(recallDate(client), today) === offset,
    )
    if (list.length === 0) continue
    groups.push({
      id: offset === 0 ? 'due-today' : `due-in-${offset}`,
      title: dayTitle(offset),
      offset,
      clients: list,
    })
  }

  return groups
}

export type WeekSummary = {
  offset: number
  start: Date
  end: Date
  label: string
  total: number
  clients: Client[]
}

export function weekBounds(offset: number, today = new Date()) {
  const start = startOfWeek(addWeeks(startOfDay(today), offset), {
    weekStartsOn: WEEK_STARTS_ON,
  })
  const end = endOfWeek(start, { weekStartsOn: WEEK_STARTS_ON })
  return { start, end }
}

export function weekOffsetFromDate(date: Date, today = new Date()): number {
  return differenceInCalendarWeeks(
    startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
    startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }),
    { weekStartsOn: WEEK_STARTS_ON },
  )
}

export function clientsInWeek(
  clients: Client[],
  offset: number,
  today = new Date(),
): Client[] {
  const { start, end } = weekBounds(offset, today)
  return sortByRecall(
    clients.filter((client) => {
      const date = recallDate(client)
      return date >= start && date <= end
    }),
  )
}

export function recallWeekSummaries(
  clients: Client[],
  today = new Date(),
  count = 4,
): WeekSummary[] {
  return Array.from({ length: count }, (_, offset) => {
    const { start, end } = weekBounds(offset, today)
    const list = clientsInWeek(clients, offset, today)
    return {
      offset,
      start,
      end,
      label: formatWeekRange(start, end),
      total: list.length,
      clients: list,
    }
  })
}

export type DaySummary = {
  date: Date
  dayOffset: number
  label: string
  total: number
  clients: Client[]
}

export function formatDayLabel(date: Date): string {
  return format(startOfDay(date), 'EEE d MMM yyyy')
}

export function clientsOnRecallDate(
  clients: Client[],
  date = new Date(),
): Client[] {
  const day = startOfDay(date)
  return sortByRecall(
    clients.filter((client) => isSameDay(recallDate(client), day)),
  )
}

export function recallDaysInWeek(
  clients: Client[],
  offset: number,
  today = new Date(),
): DaySummary[] {
  const now = startOfDay(today)
  const { start, end } = weekBounds(offset, now)
  return eachDayOfInterval({ start, end }).flatMap((date) => {
    const list = clientsOnRecallDate(clients, date)
    if (list.length === 0) return []
    return [
      {
        date,
        dayOffset: daysUntil(date, now),
        label: formatDayLabel(date),
        total: list.length,
        clients: list,
      },
    ]
  })
}

export type MonthSummary = {
  offset: number
  month: number
  year: number
  name: string
  label: string
  total: number
  clients: Client[]
  days: DaySummary[]
}

export function recallDaysInMonth(
  clients: Client[],
  monthOffset: number,
  today = new Date(),
): DaySummary[] {
  const now = startOfDay(today)
  const date = addMonths(startOfMonth(now), monthOffset)
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  return eachDayOfInterval({ start: monthStart, end: monthEnd }).flatMap(
    (day) => {
      const list = clientsOnRecallDate(clients, day)
      if (list.length === 0) return []
      return [
        {
          date: day,
          dayOffset: daysUntil(day, now),
          label: formatDayLabel(day),
          total: list.length,
          clients: list,
        },
      ]
    },
  )
}

export function recallMonthSummaries(
  clients: Client[],
  today: Date,
  count: number,
): MonthSummary[] {
  const now = startOfDay(today)
  return Array.from({ length: count }, (_, offset) => {
    const date = addMonths(startOfMonth(now), offset)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const list = sortByRecall(
      clients.filter((client) => {
        const due = recallDate(client)
        return due >= monthStart && due <= monthEnd
      }),
    )
    const days = recallDaysInMonth(clients, offset, now)

    return {
      offset,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      name: format(date, 'MMMM'),
      label: format(date, 'MMMM yyyy'),
      total: list.length,
      clients: list,
      days,
    }
  })
}

export function futureRecallMonthSummaries(
  clients: Client[],
  today = new Date(),
): MonthSummary[] {
  const now = startOfDay(today)
  const futureClients = clients.filter((client) => recallDate(client) >= now)
  if (futureClients.length === 0) return []

  const latestRecall = futureClients.reduce((latest, client) => {
    const due = recallDate(client)
    return due > latest ? due : latest
  }, now)
  const count = differenceInCalendarMonths(
    startOfMonth(latestRecall),
    startOfMonth(now),
  ) + 1

  return recallMonthSummaries(futureClients, now, count).filter(
    (month) => month.total > 0,
  )
}

export function sortByRecall(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => {
    const diff = recallDate(a).getTime() - recallDate(b).getTime()
    if (diff !== 0) return diff
    return a.clientName.localeCompare(b.clientName)
  })
}

export function lastVisitForRecall(
  today: Date,
  recallOffsetDays: number,
  lifespanWeeks: number,
  lead: RecallLead,
): string {
  const recall = addDays(startOfDay(today), recallOffsetDays)
  const lapse = addDays(recall, leadDays(lead))
  return format(subWeeks(lapse, lifespanWeeks), 'yyyy-MM-dd')
}
