import Dexie, { type Table } from 'dexie'
import type {
  BookingStatus,
  Client,
  ClientDraft,
  ContactStatus,
  Note,
  NoteRelatedTo,
} from '../types'
import { deviceCallingCode } from './callingCode'
import { DEFAULT_LIFESPAN_WEEKS, DEFAULT_SERVICE_TYPE } from './labels'

export const db = new Dexie('NewRecallSalon') as Dexie & {
  clients: Table<Client, string>
}

db.version(1).stores({
  clients: 'id, clientName, clientPhone, lastVisitDate',
})

function nowIso(): string {
  return new Date().toISOString()
}

function guestRelationship(draft: ClientDraft): Client['relationship'] {
  if (draft.guestIsClient) return 'self'
  return draft.relationship === 'self' ? 'other' : draft.relationship
}

function draftToFields(draft: ClientDraft) {
  const guestName = draft.guestIsClient
    ? draft.clientName.trim()
    : draft.guestName.trim()
  const relationship = guestRelationship(draft)
  const lifespanWeeks = Number.isFinite(draft.lifespanWeeks)
    ? Math.min(16, Math.max(2, Math.round(draft.lifespanWeeks)))
    : DEFAULT_LIFESPAN_WEEKS

  return {
    clientName: draft.clientName.trim(),
    clientPhone: draft.clientPhone.trim(),
    clientPhoneCode:
      draft.clientPhoneCode.replace(/\D/g, '') || deviceCallingCode(),
    guestName,
    relationship,
    serviceType: draft.serviceType ?? DEFAULT_SERVICE_TYPE,
    service: draft.service.trim(),
    lastVisitDate: draft.lastVisitDate,
    lifespanWeeks,
    recallLead: draft.recallLead,
  }
}

export async function addClient(draft: ClientDraft): Promise<string> {
  const fields = draftToFields(draft)
  const createdAt = nowIso()
  const client: Client = {
    id: crypto.randomUUID(),
    ...fields,
    bookingStatus: 'not_yet_booked',
    contactStatus: 'not_yet_contacted',
    notes: [],
    createdAt,
    updatedAt: createdAt,
  }
  await db.clients.add(client)
  return client.id
}

export async function updateClientDetails(
  id: string,
  draft: ClientDraft,
): Promise<void> {
  const existing = await db.clients.get(id)
  if (!existing) return
  const fields = draftToFields(draft)
  const visitChanged = fields.lastVisitDate !== existing.lastVisitDate
  await db.clients.put({
    ...existing,
    ...fields,
    ...(visitChanged
      ? {
          bookingStatus: 'not_yet_booked' as const,
          contactStatus: 'not_yet_contacted' as const,
        }
      : {}),
    updatedAt: nowIso(),
  })
}

export async function addClientNote(
  id: string,
  text: string,
  relatedTo: NoteRelatedTo,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const existing = await db.clients.get(id)
  if (!existing) return
  const note: Note = {
    id: crypto.randomUUID(),
    text: trimmed,
    createdAt: nowIso(),
    relatedTo,
  }
  await db.clients.update(id, {
    notes: [...existing.notes, note],
    updatedAt: nowIso(),
  })
}

export async function updateClientNote(
  clientId: string,
  noteId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const existing = await db.clients.get(clientId)
  if (!existing) return
  const notes = existing.notes.map((note) => {
    if (note.id !== noteId) return note
    if (note.text.trim() === trimmed) return note
    const replacedAt = nowIso()
    const hadText = Boolean(note.text.trim())
    return {
      ...note,
      text: trimmed,
      editedAt: hadText ? replacedAt : note.editedAt,
      versions: hadText
        ? [
            ...(note.versions ?? []),
            { text: note.text, at: note.editedAt ?? note.createdAt },
          ]
        : (note.versions ?? []),
    }
  })
  await db.clients.update(clientId, {
    notes,
    updatedAt: nowIso(),
  })
}

export async function clearClientNoteText(
  clientId: string,
  noteId: string,
): Promise<void> {
  const existing = await db.clients.get(clientId)
  if (!existing) return
  const notes = existing.notes.map((note) => {
    if (note.id !== noteId) return note
    return {
      ...note,
      text: '',
      editedAt: undefined,
      versions: [],
    }
  })
  await db.clients.update(clientId, {
    notes,
    updatedAt: nowIso(),
  })
}

export async function deleteClientNote(
  clientId: string,
  noteId: string,
): Promise<void> {
  const existing = await db.clients.get(clientId)
  if (!existing) return
  await db.clients.update(clientId, {
    notes: existing.notes.filter((note) => note.id !== noteId),
    updatedAt: nowIso(),
  })
}

export async function deleteNoteVersion(
  clientId: string,
  noteId: string,
  versionIndex: number,
): Promise<void> {
  const existing = await db.clients.get(clientId)
  if (!existing) return
  const notes = existing.notes.map((note) => {
    if (note.id !== noteId) return note
    return {
      ...note,
      versions: (note.versions ?? []).filter((_, index) => index !== versionIndex),
    }
  })
  await db.clients.update(clientId, {
    notes,
    updatedAt: nowIso(),
  })
}

export async function updateBookingStatus(
  id: string,
  bookingStatus: BookingStatus,
  noteText?: string,
): Promise<void> {
  const existing = await db.clients.get(id)
  if (!existing) return
  if (existing.bookingStatus === bookingStatus) return
  const notes = [
    ...existing.notes,
    {
      id: crypto.randomUUID(),
      text: noteText?.trim() ?? '',
      createdAt: nowIso(),
      relatedTo: 'booking' as const,
      statusValue: bookingStatus,
      previousStatusValue: existing.bookingStatus,
    },
  ]
  await db.clients.update(id, {
    bookingStatus,
    notes,
    updatedAt: nowIso(),
  })
}

export async function updateContactStatus(
  id: string,
  contactStatus: ContactStatus,
  noteText?: string,
): Promise<void> {
  const existing = await db.clients.get(id)
  if (!existing) return
  if (existing.contactStatus === contactStatus) return
  const notes = [
    ...existing.notes,
    {
      id: crypto.randomUUID(),
      text: noteText?.trim() ?? '',
      createdAt: nowIso(),
      relatedTo: 'contact' as const,
      statusValue: contactStatus,
      previousStatusValue: existing.contactStatus,
    },
  ]
  await db.clients.update(id, {
    contactStatus,
    notes,
    updatedAt: nowIso(),
  })
}

export async function deleteClient(id: string): Promise<void> {
  await db.clients.delete(id)
}

export async function replaceAllClients(clients: Client[]): Promise<void> {
  await db.transaction('rw', db.clients, async () => {
    await db.clients.clear()
    if (clients.length > 0) {
      await db.clients.bulkAdd(clients)
    }
  })
}
