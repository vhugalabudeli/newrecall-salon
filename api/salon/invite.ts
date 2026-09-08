import type { VercelRequest, VercelResponse } from '@vercel/node'
import { httpErrorStatus } from '../_lib/paystack.ts'
import { requireOwner } from '../_lib/salonAuth.ts'
import { supabaseAdmin } from '../_lib/supabaseAdmin.ts'

function authHeader(req: VercelRequest): string | undefined {
  const value = req.headers.authorization
  return typeof value === 'string' ? value : undefined
}

async function readEmail(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body) as { email?: string }
      return parsed.email?.trim().toLowerCase() || ''
    } catch {
      return ''
    }
  }
  if (req.body && typeof req.body === 'object' && 'email' in req.body) {
    return String((req.body as { email?: string }).email || '')
      .trim()
      .toLowerCase()
  }
  return ''
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (profile?.id) return profile.id as string
  const perPage = 200
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break
    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    )
    if (match) return match.id
    if (data.users.length < perPage) break
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const owner = await requireOwner(authHeader(req))
    const email = await readEmail(req)
    if (!email.includes('@')) {
      res.status(400).json({ error: 'Enter a valid email.' })
      return
    }
    if (email === owner.email) {
      res.status(400).json({ error: 'You are already the owner of this salon.' })
      return
    }

    const admin = supabaseAdmin()
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
    const existingId = await findUserIdByEmail(email)
    if (existingId) {
      const { data: membership } = await admin
        .from('salon_members')
        .select('salon_id, role')
        .eq('user_id', existingId)
        .maybeSingle()
      if (membership?.salon_id === owner.salonId) {
        res.status(200).json({ ok: true, alreadyMember: true })
        return
      }
      if (membership) {
        res.status(400).json({
          error: 'That email already belongs to another salon.',
        })
        return
      }
    }

    const { error: clearInviteError } = await admin
      .from('salon_invites')
      .delete()
      .eq('salon_id', owner.salonId)
      .eq('email', email)
      .is('accepted_at', null)
    if (clearInviteError) throw new Error(clearInviteError.message)

    const { error: inviteError } = await admin.from('salon_invites').insert({
      salon_id: owner.salonId,
      email,
      role: 'staff',
      created_by: owner.userId,
    })
    if (inviteError) {
      if (inviteError.code === '23505') {
        res.status(400).json({ error: 'That email already has an open invite.' })
        return
      }
      throw new Error(inviteError.message)
    }

    if (existingId) {
      const { error: memberError } = await admin.from('salon_members').insert({
        salon_id: owner.salonId,
        user_id: existingId,
        role: 'staff',
      })
      if (memberError) throw new Error(memberError.message)
      await admin
        .from('salon_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('salon_id', owner.salonId)
        .eq('email', email)
        .is('accepted_at', null)
      res.status(200).json({ ok: true, attached: true })
      return
    }

    const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/login`,
      data: { name: '' },
    })
    if (authError) throw new Error(authError.message)
    res.status(200).json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the invite.'
    res.status(httpErrorStatus(error)).json({ error: message })
  }
}
