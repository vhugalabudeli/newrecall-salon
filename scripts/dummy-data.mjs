import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const DEMO_ROWS = [
  { key: 'overdue-1', name: 'Demo — Amina Jacobs', offset: -1, service: 'Silk press' },
  { key: 'overdue-2', name: 'Demo — Lerato Mokoena', offset: -3, service: 'Braids' },
  { key: 'overdue-3', name: 'Demo — Naledi Dlamini', offset: -8, service: 'Wash and style' },
  { key: 'overdue-4', name: 'Demo — Zanele Nkosi', offset: -14, service: 'Loc maintenance' },
  { key: 'today-1', name: 'Demo — Priya Naidoo', offset: 0, service: 'Colour treatment' },
  { key: 'today-2', name: 'Demo — Thandi Molefe', offset: 0, service: 'Trim' },
  { key: 'week-1', name: 'Demo — Mia Williams', offset: 1, service: 'Blow-dry' },
  { key: 'week-2', name: 'Demo — Kayla Adams', offset: 2, service: 'Highlights' },
  { key: 'week-3', name: 'Demo — Nandi Khumalo', offset: 3, service: 'Treatment' },
]

function usage(message) {
  if (message) console.error(`Error: ${message}\n`)
  console.error(
    'Usage: npm run dummy-data -- <inject|remove> (--owner-email=email@example.com | --salon-id=uuid)',
  )
  process.exit(1)
}

function argument(name) {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length).trim() || ''
}

function demoId(salonId, key) {
  const hex = createHash('sha256').update(`newrecall-demo:${salonId}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function isoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function resolveSalonId(admin, ownerEmail, suppliedSalonId) {
  if (suppliedSalonId) {
    const { data, error } = await admin.from('salons').select('id, name').eq('id', suppliedSalonId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('No salon exists with that ID.')
    return data
  }

  const email = ownerEmail.toLowerCase()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error(`No profile exists for ${email}.`)

  const { data: membership, error: memberError } = await admin
    .from('salon_members')
    .select('salon_id, salons(name)')
    .eq('user_id', profile.id)
    .eq('role', 'owner')
    .maybeSingle()
  if (memberError) throw memberError
  if (!membership) throw new Error(`${email} is not a salon owner.`)
  const relation = Array.isArray(membership.salons) ? membership.salons[0] : membership.salons
  return { id: membership.salon_id, name: relation?.name || 'Unnamed salon' }
}

const action = process.argv[2]
if (action !== 'inject' && action !== 'remove') usage('Choose either inject or remove.')
const ownerEmail = argument('owner-email')
const suppliedSalonId = argument('salon-id')
if (Boolean(ownerEmail) === Boolean(suppliedSalonId)) {
  usage('Provide exactly one of --owner-email or --salon-id.')
}

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!url || !serviceKey) {
  usage('Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.')
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

try {
  const salon = await resolveSalonId(admin, ownerEmail, suppliedSalonId)
  const ids = DEMO_ROWS.map((row) => demoId(salon.id, row.key))

  if (action === 'remove') {
    const { error, count } = await admin
      .from('clients')
      .delete({ count: 'exact' })
      .eq('salon_id', salon.id)
      .in('id', ids)
    if (error) throw error
    console.log(`Removed ${count ?? 0} demo clients from ${salon.name} (${salon.id}).`)
    process.exit(0)
  }

  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const now = new Date().toISOString()
  const rows = DEMO_ROWS.map((row, index) => {
    const expectedReturn = addDays(today, row.offset)
    const lastVisit = addDays(expectedReturn, -42)
    return {
      id: ids[index],
      salon_id: salon.id,
      client_name: row.name,
      client_phone: `710000${String(index + 1).padStart(3, '0')}`,
      client_phone_code: '27',
      guest_name: row.name,
      relationship: 'self',
      service_type: 'hair',
      service: row.service,
      last_visit_date: isoDate(lastVisit),
      lifespan_weeks: 6,
      recall_lead: 'on_the_day',
      booking_status: 'not_yet_booked',
      contact_status: 'not_yet_contacted',
      created_at: now,
      updated_at: now,
    }
  })
  const { error } = await admin.from('clients').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  console.log(`Injected ${rows.length} demo clients into ${salon.name} (${salon.id}).`)
  if (today.getDay() === 0) {
    console.log('Today is Sunday, so future demo clients will appear next week rather than in Due this week.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
