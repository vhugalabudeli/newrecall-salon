import type { VercelRequest, VercelResponse } from '@vercel/node'
import { alertsConfigured, clearAlertsForEmail } from './alerts.js'
import { cancelRenewalsForEmail, httpErrorStatus, parseBody } from './paystack.js'
import { billingEmailForSalon, requireOwner } from './salonAuth.js'
import { supabaseAdmin } from './supabaseAdmin.js'

function authHeader(req: VercelRequest): string | undefined {
  return typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined
}

async function readBody(req: VercelRequest): Promise<Record<string, string>> {
  if (typeof req.body === 'string') {
    try {
      return parseBody(JSON.parse(req.body) as unknown)
    } catch {
      return {}
    }
  }
  return req.body && typeof req.body === 'object' ? parseBody(req.body) : {}
}

async function authUserIdsForEmails(emails: Set<string>): Promise<Set<string>> {
  const admin = supabaseAdmin()
  const ids = new Set<string>()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const user of data.users) {
      if (user.email && emails.has(user.email.trim().toLowerCase())) ids.add(user.id)
    }
    if (data.users.length < 1000) break
  }
  return ids
}

export async function postDeleteSalon(req: VercelRequest, res: VercelResponse) {
  try {
    const owner = await requireOwner(authHeader(req))
    const body = await readBody(req)
    if (body.salonName.trim() !== owner.salonName.trim()) {
      res.status(400).json({ error: 'Enter the salon name exactly as shown to confirm deletion.' })
      return
    }

    const admin = supabaseAdmin()
    const [{ data: members, error: memberError }, { data: invites, error: inviteError }] =
      await Promise.all([
        admin.from('salon_members').select('user_id, profiles ( email )').eq('salon_id', owner.salonId),
        admin.from('salon_invites').select('email').eq('salon_id', owner.salonId),
      ])
    if (memberError) throw new Error(memberError.message)
    if (inviteError) throw new Error(inviteError.message)

    const emails = new Set<string>([owner.email])
    const userIds = new Set<string>((members ?? []).map((row) => String(row.user_id)))
    for (const row of members ?? []) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      if (profile?.email) emails.add(String(profile.email).trim().toLowerCase())
    }
    for (const row of invites ?? []) {
      if (row.email) emails.add(String(row.email).trim().toLowerCase())
    }
    for (const id of await authUserIdsForEmails(emails)) userIds.add(id)

    await cancelRenewalsForEmail(await billingEmailForSalon(owner))
    if (alertsConfigured()) {
      await Promise.all([...emails].map((email) => clearAlertsForEmail(email)))
    }

    const { error: salonError } = await admin.from('salons').delete().eq('id', owner.salonId)
    if (salonError) throw new Error(salonError.message)
    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw new Error(error.message)
    }
    res.status(200).json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The salon account could not be deleted. Contact support@newrecall.com.'
    res.status(httpErrorStatus(error)).json({ error: message })
  }
}
