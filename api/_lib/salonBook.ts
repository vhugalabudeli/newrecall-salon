import { statusForEmail } from './paystack.js'
import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'
import type { Client, Note, NoteRelatedTo } from '../../src/types.js'

const BACKUP_KIND = 'newrecall-salon-book'
const DEFAULT_LIFESPAN_WEEKS = 6

type CatalogService = { id: string; name: string; lifespanWeeks: number }
type CatalogType = { id: string; name: string; services: CatalogService[] }
type ServiceCatalog = { types: CatalogType[] }

type BookBackup = {
  kind: typeof BACKUP_KIND
  version: 1
  exportedAt: string
  salonName: string
  messageTemplate: string
  clients: Client[]
  catalog?: ServiceCatalog
}

export type AdminTenantRow = {
  salonId: string
  salonName: string
  ownerEmail: string
  plan: string
  lastBackupAt: string | null
  lastRestoreAt: string | null
}

type ClientRow = {
  id: string
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
  booking_status: Client['bookingStatus']
  contact_status: Client['contactStatus']
  created_at: string
  updated_at: string
}

type NoteRow = {
  id: string
  client_id: string
  text: string
  related_to: NoteRelatedTo
  status_value: string | null
  previous_status_value: string | null
  created_at: string
  edited_at: string | null
}

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

function isClient(value: unknown): value is Client {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Client>
  return (
    typeof row.id === 'string' &&
    typeof row.clientName === 'string' &&
    typeof row.guestName === 'string' &&
    typeof row.lastVisitDate === 'string' &&
    Array.isArray(row.notes)
  )
}

function parseCatalog(raw: unknown): ServiceCatalog | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const data = raw as Partial<ServiceCatalog>
  if (!Array.isArray(data.types)) return undefined
  const types: CatalogType[] = []
  for (const type of data.types) {
    if (!type || typeof type.id !== 'string' || typeof type.name !== 'string') {
      return undefined
    }
    if (!Array.isArray(type.services)) return undefined
    types.push({
      id: type.id,
      name: type.name,
      services: type.services.map((service) => ({
        id: String(service.id),
        name: String(service.name),
        lifespanWeeks: Number(service.lifespanWeeks) || DEFAULT_LIFESPAN_WEEKS,
      })),
    })
  }
  return { types }
}

function parseBookBackup(raw: unknown): BookBackup | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'That file is not a NewRecall book.' }
  }
  const data = raw as Partial<BookBackup>
  if (data.kind !== BACKUP_KIND || data.version !== 1) {
    return { error: 'That file is not a NewRecall book.' }
  }
  if (!Array.isArray(data.clients) || !data.clients.every(isClient)) {
    return { error: 'That book file is damaged.' }
  }
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt:
      typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    salonName: typeof data.salonName === 'string' ? data.salonName : '',
    messageTemplate:
      typeof data.messageTemplate === 'string' ? data.messageTemplate : '',
    clients: data.clients,
    catalog: parseCatalog(data.catalog),
  }
}

function buildBookBackup(input: {
  salonName: string
  clients: Client[]
  catalog?: ServiceCatalog
}): BookBackup {
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    salonName: input.salonName,
    messageTemplate: '',
    clients: input.clients,
    catalog: input.catalog,
  }
}

export function salonCloudConfigured(): boolean {
  return supabaseConfigured()
}

export async function listTenants(): Promise<AdminTenantRow[]> {
  if (!supabaseConfigured()) return []
  const admin = supabaseAdmin()
  const { data: salons, error } = await admin
    .from('salons')
    .select('id, name, billing_email, last_backup_at, last_restore_at')
    .order('name')
  throwIf(error, 'Could not load salons.')
  const rows: AdminTenantRow[] = []
  for (const salon of salons ?? []) {
    const { data: owner } = await admin
      .from('salon_members')
      .select('user_id, profiles ( email )')
      .eq('salon_id', salon.id)
      .eq('role', 'owner')
      .maybeSingle()
    const profile = owner?.profiles as
      | { email?: string }
      | { email?: string }[]
      | null
    const info = Array.isArray(profile) ? profile[0] : profile
    const ownerEmail =
      info?.email?.trim().toLowerCase() ||
      String(salon.billing_email || '').trim().toLowerCase()
    let plan = 'none'
    const billing = String(salon.billing_email || ownerEmail || '').trim().toLowerCase()
    if (billing) {
      try {
        const status = await statusForEmail(billing)
        plan = status.entitled ? status.period : 'none'
      } catch {
        plan = 'unknown'
      }
    }
    rows.push({
      salonId: salon.id as string,
      salonName: String(salon.name || 'Your salon'),
      ownerEmail: ownerEmail || '—',
      plan,
      lastBackupAt: salon.last_backup_at ? String(salon.last_backup_at) : null,
      lastRestoreAt: salon.last_restore_at ? String(salon.last_restore_at) : null,
    })
  }
  return rows
}

async function loadCatalog(salonId: string): Promise<ServiceCatalog> {
  const admin = supabaseAdmin()
  const [{ data: types, error: typeErr }, { data: services, error: serviceErr }] =
    await Promise.all([
      admin.from('service_types').select('id, name').eq('salon_id', salonId),
      admin
        .from('services')
        .select('id, type_id, name, lifespan_weeks')
        .eq('salon_id', salonId),
    ])
  throwIf(typeErr, 'Could not load service types.')
  throwIf(serviceErr, 'Could not load services.')
  return {
    types: (types ?? []).map((type) => ({
      id: type.id as string,
      name: type.name as string,
      services: (services ?? [])
        .filter((service) => service.type_id === type.id)
        .map((service) => ({
          id: service.id as string,
          name: service.name as string,
          lifespanWeeks: Number(service.lifespan_weeks) || DEFAULT_LIFESPAN_WEEKS,
        })),
    })),
  }
}

async function loadClients(salonId: string): Promise<Client[]> {
  const admin = supabaseAdmin()
  const [clientsRes, notesRes, versionsRes] = await Promise.all([
    admin.from('clients').select('*').eq('salon_id', salonId),
    admin.from('notes').select('*').eq('salon_id', salonId),
    admin.from('note_versions').select('*').eq('salon_id', salonId),
  ])
  throwIf(clientsRes.error, 'Could not load clients.')
  throwIf(notesRes.error, 'Could not load notes.')
  throwIf(versionsRes.error, 'Could not load note history.')
  const notes = (notesRes.data ?? []) as NoteRow[]
  const versions = (versionsRes.data ?? []) as Array<{
    note_id: string
    text: string
    at: string
  }>
  const byClient = new Map<string, Note[]>()
  for (const note of notes) {
    const history = versions
      .filter((row) => row.note_id === note.id)
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((row) => ({ text: row.text, at: row.at }))
    const assembled: Note = {
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
    const list = byClient.get(note.client_id) ?? []
    list.push(assembled)
    byClient.set(note.client_id, list)
  }
  return ((clientsRes.data ?? []) as ClientRow[]).map((row) => ({
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

export async function exportTenantBook(salonId: string): Promise<BookBackup> {
  const admin = supabaseAdmin()
  const { data: salon, error } = await admin
    .from('salons')
    .select('id, name')
    .eq('id', salonId)
    .maybeSingle()
  throwIf(error, 'Could not load the salon.')
  if (!salon) throw new Error('That salon is gone.')
  const backup = buildBookBackup({
    salonName: String(salon.name || 'Your salon'),
    clients: await loadClients(salonId),
    catalog: await loadCatalog(salonId),
  })
  await admin
    .from('salons')
    .update({ last_backup_at: backup.exportedAt })
    .eq('id', salonId)
  return backup
}

export async function restoreTenantBook(
  salonId: string,
  raw: unknown,
): Promise<void> {
  const parsed = parseBookBackup(raw)
  if ('error' in parsed) throw new Error(parsed.error)
  const admin = supabaseAdmin()
  const { data: salon, error } = await admin
    .from('salons')
    .select('id')
    .eq('id', salonId)
    .maybeSingle()
  throwIf(error, 'Could not load the salon.')
  if (!salon) throw new Error('That salon is gone.')

  const { error: clearError } = await admin.from('clients').delete().eq('salon_id', salonId)
  throwIf(clearError, 'Could not clear the salon book.')

  if (parsed.clients.length > 0) {
    const { error: insertError } = await admin.from('clients').insert(
      parsed.clients.map((client) => ({
        id: client.id,
        salon_id: salonId,
        client_name: client.clientName,
        client_phone: client.clientPhone,
        client_phone_code: client.clientPhoneCode || '27',
        guest_name: client.guestName,
        relationship: client.relationship,
        service_type: client.serviceType || 'hair',
        service: client.service,
        last_visit_date: client.lastVisitDate,
        lifespan_weeks: client.lifespanWeeks,
        recall_lead: client.recallLead,
        booking_status: client.bookingStatus,
        contact_status: client.contactStatus,
        created_at: client.createdAt,
        updated_at: client.updatedAt,
      })),
    )
    throwIf(insertError, 'Could not restore clients.')
    for (const client of parsed.clients) {
      if (client.notes.length === 0) continue
      const { error: noteError } = await admin.from('notes').insert(
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
      throwIf(noteError, 'Could not restore notes.')
      const versions = client.notes.flatMap((note) =>
        (note.versions ?? []).map((version) => ({
          note_id: note.id,
          salon_id: salonId,
          text: version.text,
          at: version.at,
        })),
      )
      if (versions.length > 0) {
        const { error: versionError } = await admin.from('note_versions').insert(versions)
        throwIf(versionError, 'Could not restore note history.')
      }
    }
  }

  if (parsed.catalog) {
    await admin.from('service_types').delete().eq('salon_id', salonId)
    if (parsed.catalog.types.length > 0) {
      const { error: typeError } = await admin.from('service_types').insert(
        parsed.catalog.types.map((type) => ({
          id: type.id,
          salon_id: salonId,
          name: type.name,
        })),
      )
      throwIf(typeError, 'Could not restore service types.')
      const services = parsed.catalog.types.flatMap((type) =>
        type.services.map((service) => ({
          id: service.id,
          salon_id: salonId,
          type_id: type.id,
          name: service.name,
          lifespan_weeks: service.lifespanWeeks,
        })),
      )
      if (services.length > 0) {
        const { error: serviceError } = await admin.from('services').insert(services)
        throwIf(serviceError, 'Could not restore services.')
      }
    }
  }

  if (parsed.salonName.trim()) {
    await admin.from('salons').update({ name: parsed.salonName.trim() }).eq('id', salonId)
  }
  await admin
    .from('salons')
    .update({ last_restore_at: new Date().toISOString() })
    .eq('id', salonId)
}
