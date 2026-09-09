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
import { requireSalonId } from './salonSession'
import { supabase } from './supabase'

type ClientRow = {
  id: string
  salon_id: string
  client_name: string
  client_phone: string
  client_phone_code: string
  guest_name: string
  relationship: Client['relationship']
  service_type: string
  service: string
  last_visit_date: string
  lifespan_weeks: number
  recall_lead: Client['recallLead']
  booking_status: BookingStatus
  contact_status: ContactStatus
  created_at: string
  updated_at: string
}

type NoteRow = {
  id: string
  salon_id: string
  client_id: string
  text: string
  related_to: NoteRelatedTo
  status_value: string | null
  previous_status_value: string | null
  created_at: string
  edited_at: string | null
}

type VersionRow = {
  id: string
  note_id: string
  salon_id: string
  text: string
  at: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asUuid(id: string): string {
  return UUID_RE.test(id) ? id : crypto.randomUUID()
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

function toClientRow(
  salonId: string,
  client: Omit<Client, 'notes'> & { notes?: Note[] },
): Omit<ClientRow, 'salon_id'> & { salon_id: string } {
  return {
    id: client.id,
    salon_id: salonId,
    client_name: client.clientName,
    client_phone: client.clientPhone,
    client_phone_code: client.clientPhoneCode ?? deviceCallingCode(),
    guest_name: client.guestName,
    relationship: client.relationship,
    service_type: client.serviceType ?? DEFAULT_SERVICE_TYPE,
    service: client.service,
    last_visit_date: client.lastVisitDate,
    lifespan_weeks: client.lifespanWeeks,
    recall_lead: client.recallLead,
    booking_status: client.bookingStatus,
    contact_status: client.contactStatus,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  }
}

function noteFromRows(note: NoteRow, versions: VersionRow[]): Note {
  const history = versions
    .filter((row) => row.note_id === note.id)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((row) => ({ text: row.text, at: row.at }))
  return {
    id: note.id,
    text: note.text,
    createdAt: note.created_at,
    editedAt: note.edited_at ?? undefined,
    versions: history.length > 0 ? history : undefined,
    relatedTo: note.related_to,
    statusValue: (note.status_value as Note['statusValue']) ?? undefined,
    previousStatusValue:
      (note.previous_status_value as Note['previousStatusValue']) ?? undefined,
  }
}

function assembleClients(
  rows: ClientRow[],
  notes: NoteRow[],
  versions: VersionRow[],
): Client[] {
  const byClient = new Map<string, Note[]>()
  for (const note of notes) {
    const list = byClient.get(note.client_id) ?? []
    list.push(noteFromRows(note, versions))
    byClient.set(note.client_id, list)
  }
  for (const list of byClient.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  return rows.map((row) => ({
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientPhoneCode: row.client_phone_code,
    guestName: row.guest_name,
    relationship: row.relationship,
    serviceType: row.service_type,
    service: row.service,
    lastVisitDate: row.last_visit_date,
    lifespanWeeks: row.lifespan_weeks,
    recallLead: row.recall_lead,
    bookingStatus: row.booking_status,
    contactStatus: row.contact_status,
    notes: byClient.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function listClients(): Promise<Client[]> {
  const salonId = requireSalonId()
  const [clientsRes, notesRes, versionsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('salon_id', salonId),
    supabase.from('notes').select('*').eq('salon_id', salonId),
    supabase.from('note_versions').select('*').eq('salon_id', salonId),
  ])
  throwIf(clientsRes.error, 'Could not load clients.')
  throwIf(notesRes.error, 'Could not load notes.')
  throwIf(versionsRes.error, 'Could not load note history.')
  return assembleClients(
    (clientsRes.data ?? []) as ClientRow[],
    (notesRes.data ?? []) as NoteRow[],
    (versionsRes.data ?? []) as VersionRow[],
  )
}

async function getClient(id: string): Promise<Client | null> {
  const salonId = requireSalonId()
  const [clientRes, notesRes, versionsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('salon_id', salonId).eq('id', id).maybeSingle(),
    supabase.from('notes').select('*').eq('salon_id', salonId).eq('client_id', id),
    supabase.from('note_versions').select('*').eq('salon_id', salonId),
  ])
  throwIf(clientRes.error, 'Could not load the client.')
  if (!clientRes.data) return null
  const [assembled] = assembleClients(
    [clientRes.data as ClientRow],
    (notesRes.data ?? []) as NoteRow[],
    (versionsRes.data ?? []) as VersionRow[],
  )
  return assembled ?? null
}

async function touchClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .update({ updated_at: nowIso() })
    .eq('id', id)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not update the client.')
}

async function insertNote(
  clientId: string,
  note: {
    id?: string
    text: string
    relatedTo: NoteRelatedTo
    statusValue?: string
    previousStatusValue?: string
    createdAt?: string
    editedAt?: string | null
  },
) {
  const salonId = requireSalonId()
  const { error } = await supabase.from('notes').insert({
    id: note.id ?? crypto.randomUUID(),
    salon_id: salonId,
    client_id: clientId,
    text: note.text,
    related_to: note.relatedTo,
    status_value: note.statusValue ?? null,
    previous_status_value: note.previousStatusValue ?? null,
    created_at: note.createdAt ?? nowIso(),
    edited_at: note.editedAt ?? null,
  })
  throwIf(error, 'Could not save the note.')
}

export async function addClient(draft: ClientDraft): Promise<string> {
  const salonId = requireSalonId()
  const fields = draftToFields(draft)
  const createdAt = nowIso()
  const id = crypto.randomUUID()
  const { error } = await supabase.from('clients').insert(
    toClientRow(salonId, {
      id,
      ...fields,
      bookingStatus: 'not_yet_booked',
      contactStatus: 'not_yet_contacted',
      createdAt,
      updatedAt: createdAt,
    }),
  )
  throwIf(error, 'Could not add the client.')
  return id
}

export async function updateClientDetails(
  id: string,
  draft: ClientDraft,
): Promise<void> {
  const existing = await getClient(id)
  if (!existing) return
  const fields = draftToFields(draft)
  const visitChanged = fields.lastVisitDate !== existing.lastVisitDate
  const { error } = await supabase
    .from('clients')
    .update({
      client_name: fields.clientName,
      client_phone: fields.clientPhone,
      client_phone_code: fields.clientPhoneCode,
      guest_name: fields.guestName,
      relationship: fields.relationship,
      service_type: fields.serviceType,
      service: fields.service,
      last_visit_date: fields.lastVisitDate,
      lifespan_weeks: fields.lifespanWeeks,
      recall_lead: fields.recallLead,
      ...(visitChanged
        ? {
            booking_status: 'not_yet_booked',
            contact_status: 'not_yet_contacted',
          }
        : {}),
      updated_at: nowIso(),
    })
    .eq('id', id)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not update the client.')
}

export async function addClientNote(
  id: string,
  text: string,
  relatedTo: NoteRelatedTo,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const existing = await getClient(id)
  if (!existing) return
  await insertNote(id, { text: trimmed, relatedTo })
  await touchClient(id)
}

export async function updateClientNote(
  clientId: string,
  noteId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const existing = await getClient(clientId)
  if (!existing) return
  const note = existing.notes.find((item) => item.id === noteId)
  if (!note || note.text.trim() === trimmed) return
  const hadText = Boolean(note.text.trim())
  const replacedAt = nowIso()
  if (hadText) {
    const { error } = await supabase.from('note_versions').insert({
      note_id: noteId,
      salon_id: requireSalonId(),
      text: note.text,
      at: note.editedAt ?? note.createdAt,
    })
    throwIf(error, 'Could not save note history.')
  }
  const { error } = await supabase
    .from('notes')
    .update({
      text: trimmed,
      edited_at: hadText ? replacedAt : note.editedAt ?? null,
    })
    .eq('id', noteId)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not update the note.')
  await touchClient(clientId)
}

export async function clearClientNoteText(
  clientId: string,
  noteId: string,
): Promise<void> {
  const existing = await getClient(clientId)
  if (!existing) return
  const { error } = await supabase
    .from('notes')
    .update({ text: '', edited_at: null })
    .eq('id', noteId)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not clear the note.')
  const versions = await supabase
    .from('note_versions')
    .delete()
    .eq('note_id', noteId)
    .eq('salon_id', requireSalonId())
  throwIf(versions.error, 'Could not clear note history.')
  await touchClient(clientId)
}

export async function deleteClientNote(
  clientId: string,
  noteId: string,
): Promise<void> {
  const existing = await getClient(clientId)
  if (!existing) return
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not delete the note.')
  await touchClient(clientId)
}

export async function deleteNoteVersion(
  clientId: string,
  noteId: string,
  versionIndex: number,
): Promise<void> {
  const existing = await getClient(clientId)
  if (!existing) return
  const note = existing.notes.find((item) => item.id === noteId)
  const version = note?.versions?.[versionIndex]
  if (!version) return
  const { data, error } = await supabase
    .from('note_versions')
    .select('id, at')
    .eq('note_id', noteId)
    .eq('salon_id', requireSalonId())
    .order('at', { ascending: true })
  throwIf(error, 'Could not load note history.')
  const row = (data ?? [])[versionIndex]
  if (!row) return
  const deleted = await supabase
    .from('note_versions')
    .delete()
    .eq('id', row.id)
    .eq('salon_id', requireSalonId())
  throwIf(deleted.error, 'Could not delete that version.')
  await touchClient(clientId)
}

export async function updateBookingStatus(
  id: string,
  bookingStatus: BookingStatus,
  noteText?: string,
): Promise<void> {
  const existing = await getClient(id)
  if (!existing) return
  if (existing.bookingStatus === bookingStatus) return
  await insertNote(id, {
    text: noteText?.trim() ?? '',
    relatedTo: 'booking',
    statusValue: bookingStatus,
    previousStatusValue: existing.bookingStatus,
  })
  const { error } = await supabase
    .from('clients')
    .update({ booking_status: bookingStatus, updated_at: nowIso() })
    .eq('id', id)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not update the booking status.')
}

export async function updateContactStatus(
  id: string,
  contactStatus: ContactStatus,
  noteText?: string,
): Promise<void> {
  const existing = await getClient(id)
  if (!existing) return
  if (existing.contactStatus === contactStatus) return
  await insertNote(id, {
    text: noteText?.trim() ?? '',
    relatedTo: 'contact',
    statusValue: contactStatus,
    previousStatusValue: existing.contactStatus,
  })
  const { error } = await supabase
    .from('clients')
    .update({ contact_status: contactStatus, updated_at: nowIso() })
    .eq('id', id)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not update contact.')
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('salon_id', requireSalonId())
  throwIf(error, 'Could not delete the client.')
}

async function insertNotesForClient(salonId: string, client: Client) {
  if (client.notes.length === 0) return
  const { error } = await supabase.from('notes').insert(
    client.notes.map((note) => ({
      id: note.id,
      salon_id: salonId,
      client_id: client.id,
      text: note.text,
      related_to: note.relatedTo,
      status_value: note.statusValue ?? null,
      previous_status_value: note.previousStatusValue ?? null,
      created_at: note.createdAt,
      edited_at: note.editedAt ?? null,
    })),
  )
  throwIf(error, 'Could not import notes.')
  const versions = client.notes.flatMap((note) =>
    (note.versions ?? []).map((version) => ({
      note_id: note.id,
      salon_id: salonId,
      text: version.text,
      at: version.at,
    })),
  )
  if (versions.length === 0) return
  const versionRes = await supabase.from('note_versions').insert(versions)
  throwIf(versionRes.error, 'Could not import note history.')
}

export async function replaceAllClients(clients: Client[]): Promise<void> {
  const salonId = requireSalonId()
  const remapped = clients.map((client) => {
    const id = asUuid(client.id)
    const notes = client.notes.map((note) => ({
      ...note,
      id: asUuid(note.id),
    }))
    return { ...client, id, notes }
  })
  const { error } = await supabase.from('clients').delete().eq('salon_id', salonId)
  throwIf(error, 'Could not clear the salon data before importing the backup.')
  if (remapped.length === 0) return
  const { error: insertError } = await supabase
    .from('clients')
    .insert(remapped.map((client) => toClientRow(salonId, client)))
  throwIf(insertError, 'Could not import clients.')
  for (const client of remapped) {
    await insertNotesForClient(salonId, client)
  }
}
