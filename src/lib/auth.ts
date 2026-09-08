const USERS_KEY = 'salon-app-users'
const SESSION_KEY = 'salon-app-session'
export const AUTH_CHANGED = 'salon-auth-changed'

export type AuthUser = {
  id: string
  name: string
  email: string
  salonName: string
}

type StoredUser = AuthUser & {
  passwordHash: string
  salt: string
}

type Session = {
  userId: string
}

function notify() {
  window.dispatchEvent(new Event(AUTH_CHANGED))
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(digest)
}

function toPublicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    salonName: user.salonName,
  }
}

export function readSessionUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    const user = readUsers().find((entry) => entry.id === session.userId)
    return user ? toPublicUser(user) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  notify()
}

export function logoutTo(path: string) {
  localStorage.removeItem(SESSION_KEY)
  window.location.replace(path)
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
  salonName: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const salonName = input.salonName.trim()

  if (!name) return { ok: false, error: 'Enter your name.' }
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email.' }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Use at least 8 characters for the password.' }
  }

  const users = readUsers()
  if (users.some((user) => user.email === email)) {
    return { ok: false, error: 'That email already has an account. Log in instead.' }
  }

  const salt = randomSalt()
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    salonName,
    salt,
    passwordHash: await hashPassword(password, salt),
  }
  writeUsers([...users, user])
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id } satisfies Session))
  notify()
  return { ok: true, user: toPublicUser(user) }
}

export async function loginAccount(input: {
  email: string
  password: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email || !password) {
    return { ok: false, error: 'Enter your email and password.' }
  }

  const user = readUsers().find((entry) => entry.email === email)
  if (!user) {
    return { ok: false, error: 'Email or password is incorrect.' }
  }
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Email or password is incorrect.' }
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id } satisfies Session))
  notify()
  return { ok: true, user: toPublicUser(user) }
}
