import { useEffect, useState, type FormEvent } from 'react'
import { addClientNote, deleteClientNote, updateClientNote } from '../lib/db'
import type { Client, Note } from '../types'

type AddNoteModalProps = {
  client: Client
  note?: Note
  attachTo?: Note
  onClose: () => void
}

export function AddNoteModal({
  client,
  note,
  attachTo,
  onClose,
}: AddNoteModalProps) {
  const [text, setText] = useState(note?.text ?? '')
  const [saving, setSaving] = useState(false)
  const editing = Boolean(note)
  const canSave = text.trim().length > 0 && text.trim() !== (note?.text.trim() ?? '')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    if (editing && !canSave) {
      onClose()
      return
    }
    setSaving(true)
    try {
      if (note) {
        await updateClientNote(client.id, note.id, text)
      } else if (attachTo && !attachTo.text.trim()) {
        await updateClientNote(client.id, attachTo.id, text)
      } else {
        await addClientNote(client.id, text, 'general')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-cocoa/30"
        aria-label="Cancel note"
        onClick={onClose}
      />
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="relative w-full max-w-md rounded-t-2xl bg-ivory p-5 shadow-2xl md:rounded-2xl"
      >
        <p className="text-xs font-medium tracking-wide text-blush-dark uppercase">
          {editing ? 'Edit note' : 'Add a note'}
        </p>
        <h2 className="font-display mt-1 text-xl font-semibold">
          {client.clientName}
        </h2>
        <textarea
          className="mt-4 min-h-24 w-full min-w-0 rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-blush md:text-sm"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What did they say?"
          autoFocus
        />
        <div className="mt-4 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
          {editing ? (
            <button
              type="button"
              onClick={() => {
                if (!note) return
                const confirmed = window.confirm('Remove this note?')
                if (!confirmed) return
                void deleteClientNote(client.id, note.id).then(onClose)
              }}
              className="text-sm text-overdue hover:underline"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg px-3 py-2 text-sm text-cocoa-soft hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!text.trim() || saving || (editing && !canSave)}
            className="rounded-lg bg-blush px-4 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Save note'}
          </button>
        </div>
      </form>
    </div>
  )
}
