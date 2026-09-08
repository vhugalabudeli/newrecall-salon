import { createClient, type User } from '@supabase/supabase-js'

export function supabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    ''
  )
}

export function supabaseAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    ''
  )
}

export function supabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
}

export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey())
}

export function supabaseAdmin() {
  const url = supabaseUrl()
  const key = supabaseServiceKey()
  if (!url || !key) {
    throw new Error('Supabase is not configured on the server.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function bearerToken(header: string | undefined): string {
  if (!header) return ''
  const value = Array.isArray(header) ? header[0] : header
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export async function userFromBearer(
  authHeader: string | undefined,
): Promise<User> {
  const token = bearerToken(authHeader)
  if (!token) throw new Error('Sign in required.')
  const url = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!url || !anon) throw new Error('Supabase is not configured on the server.')
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) throw new Error('Sign in required.')
  return data.user
}
