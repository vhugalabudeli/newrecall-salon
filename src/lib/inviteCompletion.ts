import { loadAuthUser, type AuthUser } from './auth'
import { supabase } from './supabase'

export type InviteCompletionResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string }

export function validateInviteCompletion(
  name: string,
  password: string,
  confirmation: string,
): string | null {
  if (!name.trim()) return 'Enter your name.'
  if (password.length < 8) return 'Use at least 8 characters for the password.'
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}

export async function completeInvite(input: {
  name: string
  password: string
  confirmation: string
}): Promise<InviteCompletionResult> {
  const error = validateInviteCompletion(
    input.name,
    input.password,
    input.confirmation,
  )
  if (error) return { ok: false, error }

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) {
    return {
      ok: false,
      error: 'This invitation link is invalid or expired. Ask the salon owner to send a new invite.',
    }
  }

  const name = input.name.trim()
  const { error: authError } = await supabase.auth.updateUser({
    password: input.password,
    data: { ...user.user_metadata, name },
  })
  if (authError) return { ok: false, error: authError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (profileError) return { ok: false, error: profileError.message }

  const authUser = await loadAuthUser()
  if (!authUser || authUser.role !== 'staff') {
    return {
      ok: false,
      error: 'This account is not attached to a staff invitation. Ask the salon owner to send a new invite.',
    }
  }
  return { ok: true, user: authUser }
}
