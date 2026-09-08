import type { ClientDraft } from '../types'

const STORAGE_KEY = 'salon-app-book-draft'

export type BookDraft = {
  returnTo: string
  clientId?: string
  draft: ClientDraft
}

export function peekBookDraft(): BookDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BookDraft
    if (!parsed || typeof parsed.returnTo !== 'string' || !parsed.draft) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveBookDraft(draft: BookDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function clearBookDraft() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function shouldResumeBookAdd(path: string): boolean {
  const pending = peekBookDraft()
  return Boolean(pending && pending.returnTo === path && !pending.clientId)
}

export function resumeBookEditId(path: string): string | null {
  const pending = peekBookDraft()
  if (!pending || pending.returnTo !== path) return null
  return pending.clientId ?? null
}
