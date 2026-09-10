import type { AdminLookup, AdminOverview, AdminSupportNote } from './adminTypes'

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/csv')) {
    const text = await res.text()
    if (!res.ok) throw new Error('The billing report could not be downloaded. Try again.')
    return text as T
  }
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'The operations request could not be completed. Please try again.'
    throw new Error(error)
  }
  return json as T
}

export function fetchAdminSession(): Promise<{ email: string }> {
  return request('/api/admin/session')
}

export function adminLogin(email: string, password: string, totp: string) {
  return request<{ email: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, totp }),
  })
}

export function adminLogout() {
  return request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' })
}

export function fetchAdminOverview(): Promise<AdminOverview> {
  return request('/api/admin/overview')
}

export function fetchAdminLookup(email: string): Promise<AdminLookup> {
  return request(`/api/admin/lookup?email=${encodeURIComponent(email)}`)
}

export function repairAdminCheckout(input: {
  email: string
  reference: string
  userId?: string
}) {
  return request('/api/admin/repair', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function openAdminPortal(input: {
  email: string
  subscriptionCode: string
}): Promise<string> {
  const data = await request<{ link: string }>('/api/admin/portal', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.link
}

export function addAdminSupport(input: {
  kind: 'book_locked' | 'billing'
  email: string
  note: string
}) {
  return request<{ stored: boolean; note?: AdminSupportNote; error?: string }>(
    '/api/admin/support',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function downloadBillingCsv(): Promise<void> {
  const res = await fetch('/api/admin/csv', { credentials: 'include' })
  if (!res.ok) {
    const json: unknown = await res.json().catch(() => ({}))
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'The billing report could not be downloaded. Try again.'
    throw new Error(error)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'newrecall-billing.csv'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function exportAdminTenant(salonId: string): Promise<void> {
  const res = await fetch(
    `/api/admin/tenant-export?salonId=${encodeURIComponent(salonId)}`,
    { credentials: 'include' },
  )
  if (!res.ok) {
    const json: unknown = await res.json().catch(() => ({}))
    const error =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : 'The selected salon backup could not be downloaded. Try again.'
    throw new Error(error)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `newrecall-tenant-${salonId}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function restoreAdminTenant(salonId: string, backup: unknown) {
  return request<{ ok: boolean }>('/api/admin/tenant-restore', {
    method: 'POST',
    body: JSON.stringify({ salonId, backup: JSON.stringify(backup) }),
  })
}
