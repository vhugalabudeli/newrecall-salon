import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'nr_admin'
const SESSION_MS = 12 * 60 * 60 * 1000

export class AdminHttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function adminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ''
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? ''
}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  if (!secret) throw new AdminHttpError(503, 'Admin is not configured.')
  return secret
}

function totpSecret(): string {
  return process.env.ADMIN_TOTP_SECRET?.trim().replace(/\s+/g, '').toUpperCase() ?? ''
}

export function adminConfigured(): boolean {
  return Boolean(adminEmail() && adminPassword() && process.env.ADMIN_SESSION_SECRET?.trim() && totpSecret())
}

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const character of value.replace(/=+$/, '')) {
    const index = alphabet.indexOf(character)
    if (index < 0) throw new AdminHttpError(503, 'Admin two-factor authentication is not configured correctly.')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}

function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(binary).padStart(6, '0')
}

export function verifyTotpCode(code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false
  const step = Math.floor(now / 30_000)
  return [-1, 0, 1].some((offset) => safeEqual(code, totpAt(totpSecret(), step + offset)))
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

function encodeToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_MS }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function decodeToken(token: string): { email: string } | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (!safeEqual(signature, sign(payload))) return null
  try {
    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { email?: string; exp?: number }
    if (!data.email || typeof data.exp !== 'number') return null
    if (data.exp < Date.now()) return null
    return { email: data.email }
  } catch {
    return null
  }
}

export function cookieValue(
  header: string | undefined,
  name = COOKIE_NAME,
): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1)
  }
  return null
}

function cookieSecure(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

export function sessionCookie(email: string): string {
  const token = encodeToken(email)
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
    'SameSite=Lax',
  ]
  if (cookieSecure()) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ]
  if (cookieSecure()) parts.push('Secure')
  return parts.join('; ')
}

export function readSession(cookieHeader: string | undefined): { email: string } {
  if (!adminConfigured()) {
    throw new AdminHttpError(503, 'Admin is not configured.')
  }
  const token = cookieValue(cookieHeader)
  if (!token) throw new AdminHttpError(401, 'Sign in required.')
  const session = decodeToken(token)
  if (!session) throw new AdminHttpError(401, 'Sign in required.')
  return session
}

export function loginOperator(email: string, password: string, totp: string): string {
  if (!adminConfigured()) {
    throw new AdminHttpError(503, 'Admin is not configured.')
  }
  const expectedEmail = adminEmail()
  const givenEmail = email.trim().toLowerCase()
  const emailOk = safeEqual(givenEmail, expectedEmail)
  const passwordOk = safeEqual(password, adminPassword())
  if (!emailOk || !passwordOk || !verifyTotpCode(totp.trim())) {
    throw new AdminHttpError(401, 'Email, password, or authentication code is incorrect.')
  }
  return sessionCookie(expectedEmail)
}
