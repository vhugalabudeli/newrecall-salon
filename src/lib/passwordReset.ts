import { loadAuthUser, type AuthUser } from './auth'
import { paths } from './routes'
import {
  clearPasswordRecoveryPending,
  isPasswordRecoveryPending,
  requireSupabaseConfig,
  supabase,
} from './supabase'

export type PasswordResetResult =
  | { ok: true }
  | { ok: false; error: string }

export type PasswordResetCompleteResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string }

const EXPIRED_LINK =
  'This reset link is invalid or expired. Request a new one from sign in.'

export function loginResetPath() {
  return `${paths.login}?reset=1`
}

export function validateResetEmail(email: string): string | null {
  if (!email.trim().includes('@')) return 'Enter a valid email.'
  return null
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 8) return 'Use at least 8 characters for the password.'
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}

export function passwordResetRedirectTo() {
  return `${window.location.origin}${paths.resetPassword}`
}

export function passwordResetLinkError(): string | null {
  if (typeof window === 'undefined') return null
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (
    query.get('error') ||
    hash.get('error') ||
    query.get('error_description') ||
    hash.get('error_description')
  ) {
    return EXPIRED_LINK
  }
  return null
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResult> {
  const invalid = validateResetEmail(email)
  if (invalid) return { ok: false, error: invalid }

  try {
    requireSupabaseConfig()
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: passwordResetRedirectTo() },
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'The reset email could not be sent. Please try again.',
    }
  }
}

export async function completePasswordReset(input: {
  password: string
  confirmation: string
}): Promise<PasswordResetCompleteResult> {
  const invalid = validateNewPassword(input.password, input.confirmation)
  if (invalid) return { ok: false, error: invalid }

  if (!isPasswordRecoveryPending()) {
    return { ok: false, error: EXPIRED_LINK }
  }

  try {
    requireSupabaseConfig()
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.user) {
      return { ok: false, error: EXPIRED_LINK }
    }

    const { error } = await supabase.auth.updateUser({
      password: input.password,
    })
    if (error) return { ok: false, error: error.message }

    try {
      await supabase.auth.signOut({ scope: 'others' })
    } catch {
      // Password is already saved; other sessions can stay until they expire.
    }
    clearPasswordRecoveryPending()

    const user = await loadAuthUser()
    if (!user) {
      return {
        ok: false,
        error: 'Password saved, but this login is not attached to a salon.',
      }
    }
    return { ok: true, user }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'The password could not be updated. Please try again.',
    }
  }
}
