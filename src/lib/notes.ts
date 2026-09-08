import { format, isToday, isYesterday, startOfDay } from 'date-fns'
import type { BookingStatus, ContactStatus, Note } from '../types'

export function withInferredStatus(notes: Note[]): Note[] {
  const chronological = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  let lastContact: ContactStatus | undefined
  let lastBooking: BookingStatus | undefined

  const inferred = chronological.map((note) => {
    if (note.relatedTo === 'contact') {
      const previous = note.previousStatusValue ?? lastContact
      if (note.statusValue) lastContact = note.statusValue as ContactStatus
      return { ...note, previousStatusValue: previous }
    }
    if (note.relatedTo === 'booking') {
      const previous = note.previousStatusValue ?? lastBooking
      if (note.statusValue) lastBooking = note.statusValue as BookingStatus
      return { ...note, previousStatusValue: previous }
    }
    return note
  })

  return inferred.reverse()
}

export type NoteDayGroup = {
  key: string
  heading: string
  notes: Note[]
}

export function groupNotesByDay(notes: Note[]): NoteDayGroup[] {
  const groups: NoteDayGroup[] = []

  for (const note of notes) {
    const date = new Date(note.createdAt)
    const key = startOfDay(date).toISOString()
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.notes.push(note)
      continue
    }
    groups.push({
      key,
      heading: dayHeading(date),
      notes: [note],
    })
  }

  return groups
}

function dayHeading(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'd MMM yyyy')
}

export function staffNotes(notes: Note[]): Note[] {
  return notes.filter((note) => note.relatedTo === 'general')
}

export function movementNotes(notes: Note[]): Note[] {
  return notes.filter(
    (note) => note.relatedTo === 'contact' || note.relatedTo === 'booking',
  )
}

export function newestFirst(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function latestNoteText(client: { notes: Note[] }): string {
  const withText = newestFirst(client.notes).find((note) => note.text.trim())
  return withText?.text.trim() ?? 'No notes'
}

export type MovementEntry = {
  movement: Note
  attached: Note[]
}

export type TimelineItem =
  | { type: 'movement'; movement: Note; attached: Note[]; at: string }
  | { type: 'orphan'; note: Note; at: string }

export type TimelineDayGroup = {
  key: string
  heading: string
  items: TimelineItem[]
}

export function notesByMovement(notes: Note[]): {
  entries: MovementEntry[]
  orphans: Note[]
} {
  const inferred = withInferredStatus(notes)
  const movements = movementNotes(inferred)
  const staff = staffNotes(inferred)

  if (movements.length === 0) {
    return { entries: [], orphans: staff }
  }

  const attachedById = new Map<string, Note[]>(
    movements.map((movement) => [movement.id, []]),
  )
  const attachedIds = new Set<string>()

  for (const note of staff) {
    const nearest = nearestMovement(note, movements)
    attachedById.get(nearest.id)?.push(note)
    attachedIds.add(note.id)
  }

  return {
    entries: movements.map((movement) => ({
      movement,
      attached: attachedById.get(movement.id) ?? [],
    })),
    orphans: staff.filter((note) => !attachedIds.has(note.id)),
  }
}

export function clientTimeline(notes: Note[]): TimelineDayGroup[] {
  const { entries, orphans } = notesByMovement(notes)
  const items: TimelineItem[] = [
    ...entries.map((entry) => ({
      type: 'movement' as const,
      movement: entry.movement,
      attached: entry.attached,
      at: entry.movement.createdAt,
    })),
    ...orphans.map((note) => ({
      type: 'orphan' as const,
      note,
      at: note.createdAt,
    })),
  ].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )

  const groups: TimelineDayGroup[] = []
  for (const item of items) {
    const date = new Date(item.at)
    const key = startOfDay(date).toISOString()
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.items.push(item)
      continue
    }
    groups.push({
      key,
      heading: dayHeading(date),
      items: [item],
    })
  }
  return groups
}

export function latestMovement(notes: Note[]): Note | undefined {
  return notesByMovement(notes).entries[0]?.movement
}

export function movementHasNote(entry: MovementEntry): boolean {
  return Boolean(entry.movement.text.trim()) || entry.attached.length > 0
}

function nearestMovement(note: Note, movements: Note[]): Note {
  return movements.reduce((best, movement) => {
    const distance = Math.abs(
      new Date(movement.createdAt).getTime() - new Date(note.createdAt).getTime(),
    )
    const bestDistance = Math.abs(
      new Date(best.createdAt).getTime() - new Date(note.createdAt).getTime(),
    )
    if (distance < bestDistance) return movement
    if (distance > bestDistance) return best
    return new Date(movement.createdAt) <= new Date(best.createdAt)
      ? movement
      : best
  })
}
